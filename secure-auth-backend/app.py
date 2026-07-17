from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import bcrypt
import jwt
import secrets
import smtplib
import os
import logging
from functools import wraps

from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta, timezone

from db import get_db_connection, init_db
from config import JWT_SECRET, SMTP_USER, SMTP_PASS, COOKIE_SECURE


# -----------------------------------
# LOGGING
# -----------------------------------
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("secureauth")


# -----------------------------------
# CONSTANTS
# -----------------------------------
INVALID_CREDENTIALS_MSG = "Invalid email or password"
RATE_LIMIT_MSG = {
    "success": False,
    "message": "Too many requests. Please try again later."
}


# -----------------------------------
# UTC / EMAIL HELPERS
# -----------------------------------
def utc_now():
    """Naive UTC datetime for MySQL DATETIME storage and comparison."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_expires(minutes):
    return utc_now() + timedelta(minutes=minutes)


def utc_exp_timestamp(minutes):
    return int((datetime.now(timezone.utc) + timedelta(minutes=minutes)).timestamp())


def normalize_email(email):
    if not email:
        return email
    return email.strip().lower()


def as_utc_naive(value):
    if value is None:
        return None
    if not isinstance(value, datetime):
        return value
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def encode_jwt(payload):
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


# -----------------------------------
# CREATE FLASK APP
# -----------------------------------
app = Flask(__name__)

# Enable CORS — restrict origins in production
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
CORS(app, supports_credentials=True, origins=ALLOWED_ORIGINS)

# Rate limiting — use Redis in production for multi-worker support
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[],
    storage_uri=os.getenv("RATE_LIMIT_STORAGE", "memory://")
)


@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify(RATE_LIMIT_MSG), 429


# -----------------------------------
# COOKIE HELPERS
# -----------------------------------
def set_auth_cookie(response, token):
    response.set_cookie(
        "token",
        token,
        httponly=True,
        samesite="Lax",
        secure=COOKIE_SECURE,
        path="/"
    )


def clear_auth_cookie(response):
    response.set_cookie(
        "token",
        "",
        expires=0,
        httponly=True,
        samesite="Lax",
        secure=COOKIE_SECURE,
        path="/"
    )


# -----------------------------------
# ONE-TIME TOKEN HELPERS
# -----------------------------------
def generate_one_time_token(email, token_type, expiry_minutes=10):
    email = normalize_email(email)
    jti = secrets.token_urlsafe(32)
    expires_at = utc_expires(expiry_minutes)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO one_time_tokens (jti, email, token_type, expires_at)
        VALUES (%s, %s, %s, %s)
        """,
        (jti, email, token_type, expires_at)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return encode_jwt(
        {
            "email": email,
            "type": token_type,
            "jti": jti,
            "exp": utc_exp_timestamp(expiry_minutes)
        }
    )


def validate_one_time_token(token, token_type, expected_email=None, consume=False):
    if not token:
        return False, "Token required", None

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return False, "Token expired", None
    except Exception:
        return False, "Invalid token", None

    if decoded.get("type") != token_type:
        return False, "Invalid token type", None

    email = normalize_email(decoded.get("email"))
    jti = decoded.get("jti")

    if not email or not jti:
        return False, "Invalid token", None

    if expected_email:
        expected_email = normalize_email(expected_email)
        if email != expected_email:
            return False, "Token email mismatch", None

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT *
        FROM one_time_tokens
        WHERE jti=%s AND token_type=%s AND is_used=FALSE
        """,
        (jti, token_type)
    )
    record = cursor.fetchone()

    if not record:
        cursor.close()
        conn.close()
        return False, "Token invalid or already used", None

    expires_at = as_utc_naive(record["expires_at"])
    if utc_now() > expires_at:
        cursor.close()
        conn.close()
        return False, "Token expired", None

    if normalize_email(record["email"]) != email:
        cursor.close()
        conn.close()
        return False, "Token email mismatch", None

    if consume:
        cursor.execute(
            "UPDATE one_time_tokens SET is_used=TRUE WHERE jti=%s",
            (jti,)
        )
        conn.commit()

    cursor.close()
    conn.close()
    return True, email, jti


def consume_one_time_token(jti):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE one_time_tokens SET is_used=TRUE WHERE jti=%s AND is_used=FALSE",
        (jti,)
    )
    conn.commit()
    cursor.close()
    conn.close()


# -----------------------------------
# JWT DECORATORS
# -----------------------------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get("token")

        if not token:
            return jsonify({"message": "Unauthorized"}), 401

        try:
            decoded = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"]
            )
            email = decoded.get("email")

            if not email:
                return jsonify({"message": "Invalid token"}), 401

            g.current_user_email = email

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401

        except Exception as e:
            logger.error("JWT decode error: %s", e)
            return jsonify({"message": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        admin_email = os.getenv("ADMIN_EMAIL")
        if not admin_email or normalize_email(g.current_user_email) != normalize_email(admin_email):
            return jsonify({
                "success": False,
                "message": "Unauthorized"
            }), 403
        g.is_admin = True
        return f(*args, **kwargs)

    return decorated


# -----------------------------------
# LOGIN FAILURE HELPER
# -----------------------------------
def log_failed_login(cursor, conn, email, ip_address, user_agent):
    cursor.execute(
        """
        INSERT INTO login_history
        (email, login_time, status, ip_address, user_agent)
        VALUES (%s, NOW(), 'FAILED', %s, %s)
        """,
        (email, ip_address, user_agent)
    )
    conn.commit()


def failed_login_response(email):
    security_token = generate_one_time_token(
        normalize_email(email),
        "security_snapshot",
        expiry_minutes=10
    )
    return jsonify({
        "success": False,
        "message": INVALID_CREDENTIALS_MSG,
        "security_token": security_token
    }), 401


# -----------------------------------
# HOME ROUTE
# -----------------------------------
@app.route("/")
def home():
    return "SecureAuth Backend Running 🚀"


# -----------------------------------
# TEST DATABASE
# -----------------------------------
@app.route("/test_db")
def test_db():

    init_db()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "tables": [t[0] for t in tables]
    }), 200


# -----------------------------------
# REGISTER API
# -----------------------------------
@app.route("/register", methods=["POST"])
@limiter.limit("3 per hour")
def register():

    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    # Basic field validation
    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required"
        }), 400

    # Email format validation (simple)
    if "@" not in email or "." not in email:
        return jsonify({
            "success": False,
            "message": "Invalid email format"
        }), 400

    # Password length validation
    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must be at least 8 characters"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if user exists
    cursor.execute(
        "SELECT * FROM users WHERE email=%s",
        (email,)
    )

    user = cursor.fetchone()

    if user:
        cursor.close()
        conn.close()
        return jsonify({
            "success": False,
            "message": "User already exists"
        }), 409

    # Hash password
    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # Insert user
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (name, email, phone, password)
        VALUES (%s, %s, %s, %s)
        """,
        (name, email, None, hashed_password)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Registration successful"
    }), 200


# -----------------------------------
# LOGIN API
# -----------------------------------
@app.route("/login_verify", methods=["POST"])
@limiter.limit("5 per minute")
def login_verify():

    data = request.get_json() or {}

    email = normalize_email(data.get("email"))
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": INVALID_CREDENTIALS_MSG
        }), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM users WHERE email=%s",
        (email,)
    )

    user = cursor.fetchone()

    ip_address = request.remote_addr
    user_agent = request.headers.get("User-Agent", "Unknown")

    # USER NOT FOUND
    if not user:
        log_failed_login(cursor, conn, email, ip_address, user_agent)
        cursor.close()
        conn.close()
        return failed_login_response(email)

    # WRONG PASSWORD
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):
        log_failed_login(cursor, conn, email, ip_address, user_agent)
        cursor.close()
        conn.close()
        return failed_login_response(email)

    # SUCCESS LOGIN
    cursor.execute(
        """
        INSERT INTO login_history
        (email, login_time, status, ip_address, user_agent)
        VALUES (%s, NOW(), 'SUCCESS', %s, %s)
        """,
        (email, ip_address, user_agent)
    )

    conn.commit()

    # CREATE JWT
    token = encode_jwt(
        {
            "email": user["email"],
            "exp": utc_exp_timestamp(120)
        }
    )

    cursor.close()
    conn.close()

    response = jsonify({
        "success": True,
        "user": {
            "email": user["email"]
        }
    })

    set_auth_cookie(response, token)

    return response


# -----------------------------------
# CHECK SESSION (/me)
# -----------------------------------
@app.route("/me", methods=["GET"])
@login_required
def get_me():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            id,
            name,
            email,
            created_at
        FROM users
        WHERE email=%s
        """,
        (g.current_user_email,)
    )

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404

    admin_email = os.getenv("ADMIN_EMAIL")
    is_admin = (
        normalize_email(user.get("email")) == normalize_email(admin_email)
        if admin_email
        else False
    )

    return jsonify({
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "created_at": user.get("created_at"),
        },
        "is_admin": is_admin
    })


# -----------------------------------
# SEND SNAPSHOT EMAIL
# -----------------------------------
@app.route("/send_snapshot_email", methods=["POST"])
@limiter.limit("10 per hour")
def send_snapshot_email():

    try:

        logger.info("Snapshot endpoint triggered")

        security_token = request.form.get("security_token")
        raw_email = request.form.get("email", "Unknown")
        attempted_email = (
            normalize_email(raw_email)
            if raw_email and raw_email != "Unknown"
            else raw_email
        )

        valid, error_msg, _ = validate_one_time_token(
            security_token,
            "security_snapshot",
            expected_email=attempted_email if attempted_email != "Unknown" else None,
            consume=True
        )

        if not valid:
            return jsonify({
                "success": False,
                "message": error_msg or "Unauthorized snapshot request"
            }), 401

        if "snapshot" not in request.files:
            return jsonify({
                "success": False,
                "message": "No snapshot provided"
            }), 400

        file = request.files["snapshot"]

        if file.filename == "":
            return jsonify({
                "success": False,
                "message": "No file selected"
            }), 400

        image_data = file.read()

        # SECURITY ALERT EMAIL
        admin_email = os.getenv("SECURITY_ALERT_EMAIL")

        timestamp = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        ip_address = request.remote_addr

        user_agent = request.headers.get(
            "User-Agent",
            "Unknown"
        )

        smtp_user = SMTP_USER
        smtp_pass = SMTP_PASS

        # CHECK CONFIG
        if not admin_email:

            logger.warning("SECURITY_ALERT_EMAIL not configured")

            return jsonify({
                "success": True,
                "message": "Alert skipped"
            }), 200

        if not smtp_user or not smtp_pass:

            logger.warning("SMTP credentials missing")

            return jsonify({
                "success": True,
                "message": "SMTP not configured"
            }), 200

        # CREATE EMAIL
        msg = MIMEMultipart()

        msg["Subject"] = "🚨 Unauthorized Login Attempt Detected"
        msg["From"] = smtp_user
        msg["To"] = admin_email

        body = f"""
🚨 Unauthorized Login Attempt Detected

Attempted Email:
{attempted_email}

Time:
{timestamp}

IP Address:
{ip_address}

Browser/User-Agent:
{user_agent}

Login Status:
FAILED LOGIN

A suspicious webcam snapshot is attached.

This is an automated security alert from SecureAuth.
"""

        msg.attach(MIMEText(body, "plain"))

        # ATTACH IMAGE
        image = MIMEImage(
            image_data,
            name="suspicious_login.jpg"
        )

        image.add_header(
            "Content-Disposition",
            "attachment",
            filename="suspicious_login.jpg"
        )

        msg.attach(image)

        logger.info("Sending security alert email...")

        # SEND EMAIL
        with smtplib.SMTP("smtp.gmail.com", 587) as server:

            server.starttls()

            server.login(
                smtp_user,
                smtp_pass
            )

            server.send_message(msg)

        logger.info("Security alert email sent successfully")

        return jsonify({
            "success": True,
            "message": "Security alert sent"
        }), 200

    except Exception as e:

        logger.error("Email send error: %s", e)

        return jsonify({
            "success": True,
            "message": "Alert failed silently"
        }), 200


# -----------------------------------
# SEND OTP
# -----------------------------------
@app.route("/send_otp", methods=["POST"])
@limiter.limit("3 per 5 minutes")
def send_otp():

    data = request.get_json() or {}

    email = data.get("email")

    if not email:
        return jsonify({
            "success": False,
            "message": "Email required"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # DELETE OLD OTPS
    cursor.execute(
        "DELETE FROM otps WHERE email=%s",
        (email,)
    )

    # GENERATE OTP
    otp = str(
        secrets.randbelow(1000000)
    ).zfill(6)

    otp_hash = bcrypt.hashpw(
        otp.encode(),
        bcrypt.gensalt()
    ).decode()

    expires_at = utc_expires(10)

    # STORE OTP
    cursor.execute(
        """
        INSERT INTO otps
        (email, otp_hash, expires_at)
        VALUES (%s, %s, %s)
        """,
        (normalize_email(email), otp_hash, expires_at)
    )

    conn.commit()

    # SEND EMAIL
    smtp_user = SMTP_USER
    smtp_pass = SMTP_PASS

    if smtp_user and smtp_pass:

        msg = MIMEText(
            f"""
Your SecureAuth OTP is:

{otp}

Valid for 10 minutes.

Do not share this OTP.
"""
        )

        msg["Subject"] = "SecureAuth OTP - Password Reset"
        msg["From"] = smtp_user
        msg["To"] = email

        try:
            with smtplib.SMTP("smtp.gmail.com", 587) as server:

                server.starttls()

                server.login(
                    smtp_user,
                    smtp_pass
                )

                server.send_message(msg)

        except Exception as smtp_err:
            logger.error("SMTP error in send_otp: %s", smtp_err)
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Failed to send OTP email. Please try again."
            }), 500

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "OTP sent successfully"
        }), 200

    else:

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "SMTP not configured"
        }), 500


# -----------------------------------
# VERIFY OTP
# -----------------------------------
@app.route("/verify_otp", methods=["POST"])
@limiter.limit("5 per 10 minutes")
def verify_otp():

    data = request.get_json() or {}

    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        return jsonify({
            "success": False,
            "message": "Email and OTP required"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT *
        FROM otps
        WHERE email=%s
        AND is_used=FALSE
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (email,)
    )

    otp_record = cursor.fetchone()

    if not otp_record:

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "No active OTP"
        }), 400

    # CHECK EXPIRY
    if utc_now() > as_utc_naive(otp_record["expires_at"]):

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "OTP expired"
        }), 400

    # VERIFY HASH
    if not bcrypt.checkpw(
        otp.encode(),
        otp_record["otp_hash"].encode()
    ):

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "Invalid OTP"
        }), 400

    # MARK USED
    cursor.execute(
        "UPDATE otps SET is_used=TRUE WHERE id=%s",
        (otp_record["id"],)
    )

    conn.commit()

    cursor.close()
    conn.close()

    reset_token = generate_one_time_token(
        email,
        "password_reset",
        expiry_minutes=10
    )

    return jsonify({
        "success": True,
        "message": "OTP verified",
        "reset_token": reset_token
    }), 200


# -----------------------------------
# RESET PASSWORD
# -----------------------------------
@app.route("/reset_password", methods=["POST"])
@limiter.limit("3 per 10 minutes")
def reset_password():

    data = request.get_json() or {}

    email = data.get("email")
    new_password = data.get("password")
    reset_token = data.get("reset_token")

    if not email or not new_password or not reset_token:
        return jsonify({
            "success": False,
            "message": "Email, password, and reset_token are required"
        }), 400

    if len(new_password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must be at least 8 characters"
        }), 400

    valid, error_msg, jti = validate_one_time_token(
        reset_token,
        "password_reset",
        expected_email=email,
        consume=False
    )

    if not valid:
        return jsonify({
            "success": False,
            "message": error_msg or "Invalid or expired reset token"
        }), 401

    hashed_password = bcrypt.hashpw(
        new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE users
        SET password=%s
        WHERE email=%s
        """,
        (hashed_password, email)
    )

    if cursor.rowcount == 0:

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    conn.commit()

    consume_one_time_token(jti)

    cursor.close()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Password reset successful"
    }), 200


# -----------------------------------
# LOGOUT
# -----------------------------------
@app.route("/logout", methods=["POST"])
def logout():

    response = jsonify({
        "message": "Logged out"
    })

    clear_auth_cookie(response)

    return response


# -----------------------------------
# LOGIN HISTORY
# -----------------------------------
@app.route("/login_history", methods=["GET"])
@login_required
def login_history():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    admin_email = os.getenv("ADMIN_EMAIL")
    is_admin = (
        normalize_email(g.current_user_email) == normalize_email(admin_email)
        if admin_email
        else False
    )

    # Admin-only global endpoint
    # Even if someone manually calls /login_history?admin=1, it must be authenticated + admin.
    if request.args.get("admin") == "1" and is_admin:
        cursor.execute(
            """
            SELECT
                email,
                login_time,
                status,
                ip_address,
                user_agent
            FROM login_history
            ORDER BY login_time DESC
            LIMIT 10
            """
        )
    elif request.args.get("admin") == "1" and not is_admin:
        cursor.close()
        conn.close()
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    else:
        cursor.execute(
            """
            SELECT
                email,
                login_time,
                status,
                ip_address,
                user_agent
            FROM login_history
            WHERE email=%s
            ORDER BY login_time DESC
            LIMIT 10
            """,
            (g.current_user_email,)
        )

    records = cursor.fetchall()

    cursor.close()
    conn.close()

    # DATETIME TO STRING
    for record in records:

        if record["login_time"]:

            record["login_time"] = record[
                "login_time"
            ].strftime("%Y-%m-%d %H:%M:%S")

    return jsonify({
        "history": records
    }), 200


# -----------------------------------
# ADMIN HELPERS
# -----------------------------------
def format_datetime_fields(records, fields):
    for record in records:
        for field in fields:
            if record.get(field):
                record[field] = record[field].strftime("%Y-%m-%d %H:%M:%S")
    return records


# -----------------------------------
# ADMIN STATS
# -----------------------------------
@app.route("/admin/stats", methods=["GET"])
@admin_required
@limiter.limit("30 per minute")
def admin_stats():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total_users FROM users")
    total_users = cursor.fetchone()["total_users"]

    cursor.execute("SELECT COUNT(*) AS total_logins FROM login_history")
    total_logins = cursor.fetchone()["total_logins"]

    cursor.execute(
        """
        SELECT COUNT(*) AS successful_logins
        FROM login_history
        WHERE status = 'SUCCESS'
        """
    )
    successful_logins = cursor.fetchone()["successful_logins"]

    cursor.execute(
        """
        SELECT COUNT(*) AS failed_logins
        FROM login_history
        WHERE status = 'FAILED'
        """
    )
    failed_logins = cursor.fetchone()["failed_logins"]

    cursor.close()
    conn.close()

    if total_logins > 0:
        success_rate = round((successful_logins / total_logins) * 100, 2)
    else:
        success_rate = 0.0

    return jsonify({
        "total_users": total_users,
        "total_logins": total_logins,
        "successful_logins": successful_logins,
        "failed_logins": failed_logins,
        "success_rate": success_rate
    }), 200


# -----------------------------------
# ADMIN REGISTRATIONS
# -----------------------------------
@app.route("/admin/registrations", methods=["GET"])
@admin_required
@limiter.limit("30 per minute")
def admin_registrations():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT name, email, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
        """
    )

    records = cursor.fetchall()

    cursor.close()
    conn.close()

    format_datetime_fields(records, ["created_at"])

    return jsonify({
        "registrations": records
    }), 200


# -----------------------------------
# ADMIN LOGIN HISTORY
# -----------------------------------
@app.route("/admin/login-history", methods=["GET"])
@admin_required
@limiter.limit("30 per minute")
def admin_login_history():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            email,
            login_time,
            status,
            ip_address,
            user_agent
        FROM login_history
        ORDER BY login_time DESC
        LIMIT 10
        """
    )

    records = cursor.fetchall()

    cursor.close()
    conn.close()

    format_datetime_fields(records, ["login_time"])

    return jsonify({
        "history": records
    }), 200


# -----------------------------------
# HEALTH CHECK (for Docker / platform monitoring)
# -----------------------------------
@app.route("/health")
def health():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({"status": "healthy"}), 200
    except Exception:
        return jsonify({"status": "unhealthy"}), 503


# -----------------------------------
# INITIALIZE DATABASE
# -----------------------------------
# Run init_db() at module level so Gunicorn workers pick it up.
# The guard prevents running during import-only scenarios.
try:
    init_db()
    logger.info("Database tables initialized")
except Exception as e:
    logger.warning("Could not initialize DB at startup (will retry on first request): %s", e)


# -----------------------------------
# RUN SERVER (development only)
# -----------------------------------
if __name__ == "__main__":

    logger.info("SecureAuth Backend Started (dev mode)")

    app.run(
        debug=False,
        host="0.0.0.0",
        port=5000
    )
