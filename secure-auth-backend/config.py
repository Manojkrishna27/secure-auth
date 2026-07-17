import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "secureauth")

# JWT_SECRET is REQUIRED — no unsafe default
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required. Generate one with: python3 -c \"import secrets; print(secrets.token_urlsafe(64))\"")

FLASK_ENV = os.getenv("FLASK_ENV", "development")
COOKIE_SECURE = FLASK_ENV == "production"

SMTP_USER = os.getenv("EMAIL_USER")
SMTP_PASS = os.getenv("EMAIL_PASS")
