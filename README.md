# SecureAuth 🔐

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-purple.svg)](https://www.mysql.com/)

A production-ready **secure authentication system** built with Flask. Features JWT token auth, email OTP password reset, and **intruder detection** with webcam snapshots emailed on failed logins. Modern UI with dashboard stats, charts, and real-time security monitoring.

## ✨ Features

- 🔐 **Secure Login** - JWT cookies (HttpOnly/SameSite), bcrypt passwords
- 📱 **Responsive Dashboard** - Stats, charts (Chart.js), login history, security status
- 🔑 **Password Reset** - 6-digit OTP via email
- 👁️ **Intruder Detection** - Captures webcam photo on failed attempts, emails admin
- 📊 **Real-time Analytics** - Login attempts, alerts, uptime (mock data ready for backend)
- 📧 **Email Integration** - Gmail SMTP for OTP & snapshots
- 🛡️ **Production Ready** - Env vars, .gitignore, requirements.txt

## 🛠 Tech Stack

| Frontend | Backend | Database | Other |
|----------|---------|----------|-------|
| HTML5, CSS3, Vanilla JS | Flask, JWT | MySQL | bcrypt, Gmail SMTP |

## 📸 Screenshots

### Login Page
![Login](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

*(Add your screenshots to `/screenshots/` folder)*

## 🚀 Quick Start (Local) - **FLASK ONLY**

⚠️ **CRITICAL: Use FLASK SERVER ONLY** - Do **NOT** use VSCode Live Server (breaks `{{ url_for }}` static paths)

1. **Clone & Setup**
   ```bash
   cd secure-auth-system  # or git clone ...
   python -m venv venv
   source venv/bin/activate  # Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

2. **Environment**
   ```bash
   cp .env.example .env
   # Edit .env: DB_USER, DB_PASSWORD, SMTP_USER (Gmail), SMTP_PASSWORD (App Password)
   ```

3. **Database Setup**
   ```sql
   CREATE DATABASE secure_auth;
   USE secure_auth;
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     password LONGBLOB NOT NULL
   );
   CREATE TABLE otp_verification (
     id INT AUTO_INCREMENT PRIMARY KEY,
     email VARCHAR(255) NOT NULL,
     otp VARCHAR(6) NOT NULL
   );
   -- Insert test user (password: 'password123')
   INSERT INTO users (email, password) VALUES ('test@example.com', ?); -- hashed
   ```

4. **Run FLASK Server**
   ```bash
   python app.py
   ```
   Open **[http://127.0.0.1:5000/login](http://127.0.0.1:5000/login)**

   Console: `Running on http://127.0.0.1:5000` (debug=True)

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login_verify` | `{email, password}` → JWT cookie |
| POST | `/send_otp` | Email → OTP |
| POST | `/verify_otp` | `{email, otp}` → reset form |
| POST | `/reset_password` | `{email, password}` → update |
| POST | `/save_snapshot` | `{image, lat, lng}` → email snapshot |

## 🔧 Troubleshooting Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Blank page / no styles | Tailwind CDN blocked | Check network, `ping cdn.tailwindcss.com` |
| `tailwind is not defined` | CDN fail | Refresh, check Console (F12) |
| 404 static files | Live Server used | **Stop Live Server** → `python app.py` |
| `net::ERR_NAME_NOT_RESOLVED` | Network/CDN | Use VPN/offline? → Local Tailwind later |
| JS not loading | Wrong server | Flask only: `127.0.0.1:5000` |

**VSCode:** Disable Live Server extension for this project or use **"Go Live" only on static HTML**.

**Test:** F12 Console → no red errors, Tailwind classes applied.

## ☁️ Deployment (Render.com - Free)

1. Push to GitHub
2. [Render.com](https://render.com) → New Web Service → GitHub repo
3. Runtime: Python 3
4. Build: `pip install -r requirements.txt`
5. Start: `gunicorn app:app` *(pip install gunicorn)*
4. Env vars from .env
5. MySQL: Render PostgreSQL or external

**Alternative:** Railway/Heroku/Vercel (with adjustments)

## 🎯 Best Practices (Avoid Future Errors)

- **Flask dev**: `app.run(debug=True, port=5000)` 
- **Never** Live Server for Jinja2/Flask templates
- **CDN reliability**: Tailwind CDN fast for prototypes, local CSS for prod
- **Console debugging**: F12 → Network/Console tabs first
- **Static files**: Always `{{ url_for('static', filename='...') }}`

## 🔮 Future Improvements

- [ ] Rate limiting (Flask-Limiter)
- [ ] Social login (OAuth)
- [ ] Real DB login logs/charts
- [ ] 2FA TOTP (pyotp)
- [ ] Docker
- [ ] Tests (pytest)
- [ ] CI/CD (GitHub Actions)

## 📝 Repo Setup Commands

```bash
git init
git add .
git commit -m "feat: initial secure auth system with env config"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/secure-auth-system.git
git push -u origin main
```

**Suggested Repo Name:** `secure-auth-system`

## 🤝 Contributing

1. Fork & clone
2. Create feature branch `git checkout -b feat/my-feature`
3. Commit changes `git commit -m 'feat: add something'`
4. Push & PR

## 📄 License

MIT License - see [LICENSE](LICENSE) *(Create with `touch LICENSE` & add MIT text)*

---

⭐ Star if useful! Questions? Open issue.

