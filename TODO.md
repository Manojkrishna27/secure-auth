# TODO

- [ ] FIX 2: Update `/send_snapshot_email` forensic email body template in `secure-auth-backend/app.py`.
  - [ ] Include required forensic fields in body: attempted email, timestamp, IP, browser/user-agent, login status, snapshot attachment reference.
  - [ ] Keep multipart image attachment and existing SMTP + silent capture workflow + dashboard logging + API responses.
  - [ ] Ensure recipient remains `SECURITY_ALERT_EMAIL` only (never use attempted_email as recipient).
- [ ] Re-run alert workflow tests (`security_workflow_test.py` / browser test) and verify email body fields + attachment.
- [ ] Run backend sanity check to ensure no crashes.

