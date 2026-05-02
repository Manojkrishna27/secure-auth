# SecureAuth Completion TODO

## [✅] Phase 1: Fix Refresh Loop (Critical)
- [✅] Update api.js - Skip /me in 401 interceptor
- [✅] Fix AuthContext.jsx - Proper loading + endpoints
- [✅] Update Login.jsx - Remove duplicate navigate, use api.snapshot

## [✅] Phase 2: Session Persistence & Logging (Partial)
- [✅] Backend app.py - /login_verify logging (login_history)
- [ ] Backend app.py - Enhance /me + logout + snapshot endpoint
- [ ] Test: Login → F5 → Dashboard → Logout

## [✅] Phase 3: OTP Backend (DB Ready)
- [✅] db.py - Add otps table + init
- [ ] app.py - /send_otp (SMTP + DB)
- [ ] app.py - /verify_otp + /reset_password

## [ ] Phase 4: Frontend OTP
- [ ] ForgotPassword.jsx - Real API
- [ ] VerifyOTP.jsx - Real API
- [ ] ResetPassword.jsx - Real API

## [ ] Phase 5: Security
- [ ] Backend - Failed attempts + snapshot endpoint
- [ ] Full E2E test

**Current Progress: Phase 1 ✅ | Phase 2 Login Logging**
