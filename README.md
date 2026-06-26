# Auth Assignment App

This is a Next.js / TypeScript authentication and authorization assignment app.

The app uses session-based authentication with Prisma ORM. Production is designed for PostgreSQL. Local-only development can use SQLite through `prisma/schema.local.prisma` so the app can run without Docker or a local PostgreSQL server.

## Tech Stack

- Next.js 15 App Router
- TypeScript
- React 19
- Prisma ORM
- PostgreSQL for deployment
- SQLite for local-only evaluation
- bcryptjs
- zod
- ESLint / TypeScript / Node test

## Local Run

Use this path when you only want to run the app locally.

```bash
npm install
copy .env.example .env
npm run local:setup
npm run build
npm run start
```

Open:

```text
http://localhost:3000
```

Demo accounts after `npm run local:setup`:

```text
User:
email: user@example.com
password: Password123!

Admin:
email: admin@example.com
password: AdminPassword123!
```

`npm run local:setup` resets the local SQLite database and recreates these demo accounts.

## PostgreSQL / Vercel Deployment

For Vercel, set `DATABASE_URL` to a PostgreSQL database such as Prisma Postgres, Neon, or Supabase.

Recommended Vercel Build Command:

```bash
npm run vercel-build
```

That runs:

```bash
prisma generate && prisma migrate deploy && next build
```

Required environment variable:

```text
DATABASE_URL=postgresql://...
```

If demo accounts are needed in production, run this once from a trusted terminal with the production `DATABASE_URL`. This command upserts the demo accounts and does not reset the database:

```bash
npm run seed
```

## Authentication Method

The app uses server-side session authentication.

- Login creates a random session token.
- The cookie stores the raw session token.
- The database stores only the SHA-256 hash of the token.
- Passwords are stored with bcrypt hashes.
- Cookies use `HttpOnly`, `SameSite=Lax`, `path=/`, and explicit expiration.
- Cookies use `Secure` in production.
- Regular sessions last 2 hours.
- Remember me sessions last 30 days.

## Implemented Security Features

### 1. Password Strength Meter

The sign-up form evaluates the password in real time.

Checks:

- At least 10 characters
- Uppercase letter
- Lowercase letter
- Number
- Symbol

The same rule is enforced on the server before account creation.

Confirmation steps:

1. Open `/signup`.
2. Type `abc`.
3. Confirm that missing requirements are shown.
4. Type `Password123!`.
5. Confirm that all requirements pass.

![Password strength and confirmation](./public/screenshots/signup-security.png)

### 2. Password Show / Hide Toggle

Login, sign-up, and password-change forms include a show/hide toggle for password inputs.

Confirmation steps:

1. Open `/login`, `/signup`, or `/security`.
2. Enter a password.
3. Click `Show`.
4. Confirm that the password input changes from hidden to visible.
5. Click `Hide` to hide it again.

### 3. Password Confirmation on Sign Up

The sign-up form requires a confirmation password. The server rejects mismatched passwords.

Confirmation steps:

1. Open `/signup`.
2. Enter different values in `Password` and `Confirm password`.
3. Submit the form.
4. Confirm that the server returns `Passwords do not match.`

### 4. Login Rate Limiting and Lockout

Failed login attempts are recorded by email address and IP address.

Rules:

- 5 failures within 10 minutes causes a lockout.
- Lockout lasts 5 minutes.
- The error message shows how long the user should wait.
- Admins can clear a user's lock.

Confirmation steps:

1. Open `/login`.
2. Use `user@example.com` with the wrong password several times.
3. Confirm that the lockout message appears.
4. Sign in as admin and clear the lock from `/admin/users`.

![Login lockout](./public/screenshots/login-lockout.png)

### 5. Remember Me Session Lifetime

The login form includes `Keep me signed in`.

- Disabled: 2-hour session
- Enabled: 30-day session

Confirmation steps:

1. Open `/login`.
2. Check `Keep me signed in`.
3. Sign in.
4. Open `/dashboard`.
5. Confirm that the session is marked as Remember me and expires later.

![Remember me dashboard](./public/screenshots/dashboard-remember-me.png)

### 6. Active Session List and Per-Session Revoke

The `/sessions` page lists active sessions for the current user only.

Displayed fields:

- User-Agent
- IP address
- Created time
- Last used time
- Expiration time
- Remember me status
- Current session marker

Each session can be revoked. Revoking the current session signs the browser out.

Confirmation steps:

1. Sign in.
2. Open `/sessions`.
3. Confirm the current session is listed.
4. Click `Revoke`.
5. Confirm that the session is invalidated.

![Active sessions](./public/screenshots/sessions.png)

### 7. Password Change With Current Password

The `/security` page lets a signed-in user change their password.

Rules:

- Current password is required.
- New password must pass the strength policy.
- New password must be different from the current password.
- Other active sessions are revoked after a successful password change.
- A security event is recorded.

Confirmation steps:

1. Sign in.
2. Open `/security`.
3. Try an incorrect current password and confirm rejection.
4. Enter the correct current password and a strong new password.
5. Confirm the success message and event log entry.

![Security settings](./public/screenshots/security-settings.png)

### 8. Sign Out Other Sessions

The `/security` page includes a button to revoke all other active sessions while keeping the current browser signed in.

Confirmation steps:

1. Sign in from more than one browser or session.
2. Open `/security`.
3. Click `Sign out other sessions`.
4. Confirm that only the current session remains on `/sessions`.

### 9. Security Event History

Security events are recorded in the database.

Examples:

- Sign-up
- Successful login
- Failed login
- Logout
- Session revocation
- Password change
- Admin account actions
- Blocked cross-origin form submissions

Users can view their own recent events on `/security`.

![Security event history](./public/screenshots/security-settings.png)

### 10. Admin-Only User Management

Admins can access `/admin/users`.

Admin actions:

- View users
- Suspend accounts
- Activate accounts
- Clear login locks
- Revoke suspended users' active sessions

Authorization is enforced on the server. Normal users are redirected away from admin pages and cannot run admin server actions.

![Admin users](./public/screenshots/admin-users.png)

### 11. Admin Audit Log

Admins can access `/admin/audit` to review recent security events for all users.

Confirmation steps:

1. Sign in as `admin@example.com`.
2. Open `/admin/audit`.
3. Confirm that login, password, session, and admin events are listed.

![Admin audit log](./public/screenshots/admin-audit.png)

### 12. CSRF / Origin Check for Mutating Actions

Every mutating server action verifies that the request `Origin` matches the current host.

Protected actions include:

- Login
- Sign-up
- Logout
- Session revoke
- Password change
- Sign out other sessions
- Admin suspend / activate / unlock

Blocked cross-origin form submissions are recorded as security events.

### 13. Security Headers

The app sets security headers from `next.config.ts`.

Headers include:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`
- `Strict-Transport-Security`

Confirmation command:

```bash
Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing | Select-Object -ExpandProperty Headers
```

## Main Routes

- `/` Home
- `/signup` Sign up
- `/login` Sign in
- `/dashboard` Protected dashboard
- `/security` Account security and event history
- `/sessions` Active session management
- `/admin/users` Admin user management
- `/admin/audit` Admin audit log

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

## Known Limitations

- Email verification is not implemented.
- Password reset email flow is not implemented.
- Multi-factor authentication is not implemented.
- Local SQLite setup is for local evaluation only. Vercel deployment should use PostgreSQL.
- CSP allows inline scripts/styles because Next.js needs them in this configuration. A nonce-based CSP would be stronger for production.
