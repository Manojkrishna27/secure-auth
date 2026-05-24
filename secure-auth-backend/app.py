from flask import Flask, request, jsonify
from flask_cors import CORS
import bcrypt
import jwt
import secrets
import smtplib
import os

from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta

from db import get_db_connection, init_db
from config import JWT_SECRET, SMTP_USER, SMTP_PASS


# -----------------------------------
# CREATE FLASK APP
# -----------------------------------
app = Flask(__name__)

# Enable CORS
CORS(app, supports_credentials=True)


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
def login_verify():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

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

        cursor.execute(
            """
            INSERT INTO login_history
            (email, login_time, status, ip_address, user_agent)
            VALUES (%s, NOW(), 'FAILED', %s, %s)
            """,
            (email, ip_address, user_agent)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "User not found"
        }), 401


    # WRONG PASSWORD
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):

        cursor.execute(
            """
            INSERT INTO login_history
            (email, login_time, status, ip_address, user_agent)
            VALUES (%s, NOW(), 'FAILED', %s, %s)
            """,
            (email, ip_address, user_agent)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "Wrong password"
        }), 401


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
    token = jwt.encode(
        {
            "email": user["email"],
            "exp": datetime.utcnow() + timedelta(hours=2)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    cursor.close()
    conn.close()

    response = jsonify({
        "success": True,
        "user": {
            "email": user["email"]
        }
    })

    response.set_cookie(
        "token",
        token,
        httponly=True,
        samesite="Lax",
        secure=False
    )

    return response


# -----------------------------------
# CHECK SESSION (/me)
# -----------------------------------
@app.route("/me", methods=["GET"])
def get_me():

    token = request.cookies.get("token")

    if not token:
        return jsonify({
            "message": "Unauthorized"
        }), 401

    try:

        decoded = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"]
        )

        email = decoded.get("email")

        if not email:
            return jsonify({
                "message": "Invalid token"
            }), 401

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
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({
                "message": "User not found"
            }), 404

        admin_email = os.getenv("ADMIN_EMAIL")
        is_admin = user.get("email") == admin_email

        return jsonify({
            "user": {
                "id": user.get("id"),
                "name": user.get("name"),
                "email": user.get("email"),
                "created_at": user.get("created_at"),
            },
            "is_admin": is_admin
        })

    except jwt.ExpiredSignatureError:

        return jsonify({
            "message": "Token expired"
        }), 401

    except Exception as e:

        print("Error:", e)

        return jsonify({
            "message": "Invalid token"
        }), 401



# -----------------------------------
# SEND SNAPSHOT EMAIL
# -----------------------------------
@app.route("/send_snapshot_email", methods=["POST"])
def send_snapshot_email():

    try:

        print("📸 Snapshot endpoint triggered")

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

        # ATTEMPTED LOGIN EMAIL
        attempted_email = request.form.get(
            "email",
            "Unknown"
        )

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

            print("⚠️ SECURITY_ALERT_EMAIL not configured")

            return jsonify({
                "success": True,
                "message": "Alert skipped"
            }), 200

        if not smtp_user or not smtp_pass:

            print("⚠️ SMTP credentials missing")

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

        print("📧 Sending security alert email...")

        # SEND EMAIL
        with smtplib.SMTP("smtp.gmail.com", 587) as server:

            server.starttls()

            server.login(
                smtp_user,
                smtp_pass
            )

            server.send_message(msg)

        print("✅ Security alert email sent successfully")

        return jsonify({
            "success": True,
            "message": "Security alert sent"
        }), 200

    except Exception as e:

        print("❌ Email send error:", e)

        return jsonify({
            "success": True,
            "message": "Alert failed silently"
        }), 200


# -----------------------------------
# SEND OTP
# -----------------------------------
@app.route("/send_otp", methods=["POST"])
def send_otp():

    data = request.get_json()

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

    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # STORE OTP
    cursor.execute(
        """
        INSERT INTO otps
        (email, otp_hash, expires_at)
        VALUES (%s, %s, %s)
        """,
        (email, otp_hash, expires_at)
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

        with smtplib.SMTP("smtp.gmail.com", 587) as server:

            server.starttls()

            server.login(
                smtp_user,
                smtp_pass
            )

            server.send_message(msg)

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
def verify_otp():

    data = request.get_json()

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
    if datetime.utcnow() > otp_record["expires_at"]:

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

    return jsonify({
        "success": True,
        "message": "OTP verified"
    }), 200


# -----------------------------------
# RESET PASSWORD
# -----------------------------------
@app.route("/reset_password", methods=["POST"])
def reset_password():

    data = request.get_json()

    email = data.get("email")
    new_password = data.get("password")

    if not email or not new_password:
        return jsonify({
            "success": False,
            "message": "Email and password required"
        }), 400

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

    response.set_cookie(
        "token",
        "",
        expires=0
    )

    return response


# -----------------------------------
# LOGIN HISTORY
# -----------------------------------
@app.route("/login_history", methods=["GET"])
def login_history():

    token = request.cookies.get("token")

    if not token:
        return jsonify({
            "message": "Unauthorized"
        }), 401

    try:

        decoded = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"]
        )

        email = decoded.get("email")
        if not email:
            return jsonify({
                "message": "Invalid token"
            }), 401

    except Exception as e:

        print("Error:", e)

        return jsonify({
            "message": "Invalid token"
        }), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    admin_email = os.getenv("ADMIN_EMAIL")
    is_admin = email == admin_email

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
            (email,)
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
# RUN SERVER
# -----------------------------------
if __name__ == "__main__":

    init_db()

    print("🚀 SecureAuth Backend Started")

    app.run(
        debug=False,
        host="0.0.0.0",
        port=5000
    )

