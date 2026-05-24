# TODO (SecureAuth dynamic per-user refactor)

- [ ] Backend: Update `/me` to return full logged-in user info (`id`, `name`, `email`, `created_at`).
- [ ] Backend: Update login history query so Dashboard becomes user-scoped (current logged-in user only).
- [ ] Admin clarification: Since admin must remain global, verify current Admin page expectations and adjust backend logic accordingly (likely role-based or separate behavior) without new endpoints if possible.
- [ ] Frontend: Refactor `secure-auth-frontend/src/pages/Dashboard.jsx` to remove demo/hardcoded values and use `user.name`, `user.email`, `user.created_at`.
- [ ] Frontend: Ensure Joined card formats `created_at` as `Joined May 2026`.
- [ ] Frontend: Ensure welcome text uses `user.email`.
- [ ] Frontend: Ensure Recent Login Activity uses user-scoped `/login_history`.
- [ ] Run frontend build / backend lint / quick sanity checks.

