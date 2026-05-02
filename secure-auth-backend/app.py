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

# Create Flask app
app = Flask(__name__)

# Enable CORS (important for frontend)
CORS(app, supports_credentials=True)


# Home route
@app.route("/")
def home():
    return "SecureAuth Backend Running (OTP Ready)"


# Test DB
@app.route("/test_db")
def test_db():
    from db import init_db
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"tables": [t[0] for t in tables]}), 200


# LOGIN API
@app.route("/login_verify", methods=["POST"])
def login_verify():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # Get user
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cursor.fetchone()

    # User not found - Log FAILED
    if not user:
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')
        cursor.execute(
            "INSERT INTO login_history (email, login_time, status, ip_address, user_agent) VALUES (%s, NOW(), 'FAILED', %s, %s)",
            (email, ip_address, user_agent)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 401


    # Wrong password - Log FAILED
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')
        cursor.execute(
            "INSERT INTO login_history (email, login_time, status, ip_address, user_agent) VALUES (%s, NOW(), 'FAILED', %s, %s)",
            (email, ip_address, user_agent)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "Wrong password"}), 401


    # SUCCESS - Log before token
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown')
    cursor.execute(
        "INSERT INTO login_history (email, login_time, status, ip_address, user_agent) VALUES (%s, NOW(), 'SUCCESS', %s, %s)",
        (email, ip_address, user_agent)
    )
    conn.commit()


    # Create JWT token
    token = jwt.encode({
        "email": user["email"],
        "exp": datetime.utcnow() + timedelta(hours=2)
    }, JWT_SECRET, algorithm="HS256")

    cursor.close()
    conn.close()

    # Send response + cookie
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
        samesite="Lax"
    )

    return response


# SESSION CHECK (/me)
@app.route("/me", methods=["GET"])
def get_me():
    token = request.cookies.get("token")

    if not token:
        return jsonify({"message": "Unauthorized"}), 401

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = decoded["email"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT email FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({
            "user": user
        })

    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token expired"}), 401
    except:
        return jsonify({"message": "Invalid token"}), 401


# SNAPSHOT ENDPOINT (Security) - No auth required for stealth capture
@app.route("/send_snapshot_email", methods=["POST"])
def send_snapshot_email():
    try:
        # Get the snapshot image from form data
        print("File received:", request.files.get('snapshot'))
        
        if 'snapshot' not in request.files:
            return jsonify({"success": False, "message": "No snapshot provided"}), 400

        file = request.files['snapshot']
        print("File received:", file.filename)
        
        if file.filename == '':
            return jsonify({"success": False, "message": "No file selected"}), 400

        # Get email from form data (optional, fallback to admin email)
        email = request.form.get('email', SMTP_USER)
        
        # Read image data
        image_data = file.read()
        
        # Create timestamp for logging
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Get SMTP credentials from config
        smtp_user = SMTP_USER
        smtp_pass = SMTP_PASS
        
        if smtp_user and smtp_pass:
            # Create multipart email with image attachment
            msg = MIMEMultipart()
            msg['Subject'] = 'Unauthorized Login Attempt'
            msg['From'] = smtp_user
            msg['To'] = email
            
            # Email body
            body = "A wrong password attempt was detected.\n\nTime: {}\nIP Address: {}\n\nThis is an automated security alert from SecureAuth."
            msg.attach(MIMEText(body.format(timestamp, request.remote_addr), 'plain'))
            
            # Attach image
            image = MIMEImage(image_data, filename='snapshot.jpg')
            image.add_header('Content-Disposition', 'attachment', filename='suspicious_login.jpg')
            msg.attach(image)
            
            # Send email via Gmail SMTP
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            
            return jsonify({"success": True, "message": "Security alert sent"}), 200
        else:
            # No SMTP configured - silent fail
            return jsonify({"success": True, "message": "SMTP not configured, alert skipped"}), 200
            
    except Exception as e:
        # Silent fail - do not crash the login flow
        print(f"Email send error: {e}")
        return jsonify({"success": True, "message": "Alert failed silently"}), 200


# SEND OTP (Forgot Password)
@app.route("/send_otp", methods=["POST"])
def send_otp():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400

    # Delete old OTPs
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM otps WHERE email = %s", (email,))
    
    # Generate OTP
    otp = str(secrets.randbelow(1000000)).zfill(6)
    otp_hash = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Store hashed OTP
    cursor.execute(
        "INSERT INTO otps (email, otp_hash, expires_at) VALUES (%s, %s, %s)",
        (email, otp_hash, expires_at)
    )
    conn.commit()

    # Send email
    otp_plain = otp  # Plain for email (never store)
    smtp_user = SMTP_USER
    smtp_pass = SMTP_PASS
    if smtp_user and smtp_pass:
        msg = MIMEText(f"Your SecureAuth OTP is: {otp_plain}\nValid for 10 minutes.\nDo not share.")
        msg['Subject'] = 'SecureAuth OTP - Password Reset'
        msg['From'] = smtp_user
        msg['To'] = email

        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "OTP sent to email"}), 200
    else:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "SMTP not configured"}), 500


@app.route("/verify_otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        return jsonify({"success": False, "message": "Email and OTP required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM otps WHERE email = %s AND is_used = FALSE ORDER BY created_at DESC LIMIT 1",
        (email,)
    )
    otp_record = cursor.fetchone()

    if not otp_record:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "No active OTP"}), 400

    # Check expiry
    if datetime.utcnow() > otp_record['expires_at']:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "OTP expired"}), 400

    # Verify hash
    if not bcrypt.checkpw(otp.encode(), otp_record['otp_hash'].encode()):
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "Invalid OTP"}), 400

    # Mark used
    cursor.execute("UPDATE otps SET is_used = TRUE WHERE id = %s", (otp_record['id'],))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True, "message": "OTP verified"}), 200


@app.route("/reset_password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email = data.get("email")
    new_password = data.get("password")

    if not email or not new_password:
        return jsonify({"success": False, "message": "Email and password required"}), 400

    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password = %s WHERE email = %s", (hashed_password, email))
    
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 404

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True, "message": "Password reset successful"}), 200


# LOGOUT
@app.route("/logout", methods=["POST"])
def logout():
    response = jsonify({"message": "Logged out"})
    response.set_cookie("token", "", expires=0)
    return response


# LOGIN HISTORY API
@app.route("/login_history", methods=["GET"])
def login_history():
    # Verify auth first
    token = request.cookies.get("token")
    if not token:
        return jsonify({"message": "Unauthorized"}), 401

    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        return jsonify({"message": "Invalid token"}), 401

    # Get login history (latest 10 records, sorted by time DESC)
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT email, login_time, status, ip_address, user_agent FROM login_history ORDER BY login_time DESC LIMIT 10"
    )
    records = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convert datetime to string
    for record in records:
        if record['login_time']:
            record['login_time'] = record['login_time'].strftime('%Y-%m-%d %H:%M:%S')

    return jsonify({"history": records}), 200


# Run server
if __name__ == "__main__":
    from db import init_db
    init_db()
    app.run(debug=True, host='0.0.0.0')
