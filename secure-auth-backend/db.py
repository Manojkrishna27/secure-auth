import time
import mysql.connector
from config import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME


def get_db_connection():
    retries = 10

    for attempt in range(retries):
        try:
            conn = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME
            )

            print("✅ Connected to MySQL")
            return conn

        except mysql.connector.Error as e:
            print(f"⏳ Waiting for MySQL... Attempt {attempt + 1}/{retries}")
            print("Error:", e)

            time.sleep(5)

    raise Exception("❌ Could not connect to MySQL after multiple retries")


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table (required structure)
    # Note: project may already have an older users table; we attempt safe ALTERs.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20) NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add missing columns if table existed previously with a smaller schema.
    cursor.execute("SHOW COLUMNS FROM users LIKE 'name'")
    if cursor.fetchone() is None:
        cursor.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL")

    cursor.execute("SHOW COLUMNS FROM users LIKE 'phone'")
    if cursor.fetchone() is None:
        cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL")

    # Ensure password column exists (older schema already has it, but keep defensive).
    cursor.execute("SHOW COLUMNS FROM users LIKE 'password'")
    if cursor.fetchone() is None:
        cursor.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL")


    # Login history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            login_time DATETIME NOT NULL,
            status ENUM('SUCCESS', 'FAILED') NOT NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL
        )
    """)

    # OTP table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()

    print("✅ Database tables initialized")