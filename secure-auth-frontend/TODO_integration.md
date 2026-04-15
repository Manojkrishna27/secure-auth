# Frontend-Backend Integration TODO

## Status: ✅ In Progress - BLACKBOXAI

### 1. Create/Update Core Files [TODO]
- [ ] Update `src/services/api.js` (minor interceptor/docs)
- [ ] Update `src/context/AuthContext.jsx` (simplify login, focus on /me)
- [ ] Update `src/pages/Login.jsx` (local attempts + snapshot trigger)
- [ ] Verify `src/utils/constants.js` (endpoints)

### 2. Test Integration Flow [TODO]
- [ ] Backend running on localhost:5000
- [ ] Login success → cookie set → /me → dashboard
- [ ] Login fail → snapshot after 3 attempts → /send_snapshot_email
- [ ] Refresh page → /me restores session
- [ ] Full OTP flow: forgot → verify → reset
- [ ] 401 errors → global redirect to login
- [ ] ProtectedRoute blocks unauth access

### 3. Production Polish [TODO]
- [ ] Env var for API_BASE_URL
- [ ] CORS config on backend
- [ ] Error boundary testing

**Next Step**: Implement file updates, mark complete, test.

**Interview Notes**:
- HTTP-only cookies > localStorage (XSS safe)
- Axios interceptors for global auth/error handling
- Context + reducer for auth state (scalable)
- Protected routes prevent flash of protected content

