# AGENTS.md

## Purpose

This repository is a Next.js implementation for a web security assignment focused on authentication and authorization.

The agent must prioritize secure authentication behavior, clear evaluability, and a README that explains every implemented feature. The assignment is graded using the GitHub repository README and the related source code, so undocumented features may not receive credit.

## Assignment Goal

Build a Next.js web application that uses either token-based authentication or session-based authentication.

Implement at least two authentication or authorization features that were not implemented in the base teaching material. More features are allowed when they remain secure and understandable.

## Recommended Feature Set

Prioritize these features:

- Password strength meter during sign up
- Password show/hide toggle
- Login rate limiting or lockout after repeated failures
- Remember me checkbox with different session or token lifetime
- Active session list with per-session logout
- Admin-only user list, account suspension, and unlock

If time is limited, implement the first four features before expanding to session management or admin management.

## Security Requirements

- Never store passwords in plain text.
- Hash passwords with bcrypt or an equivalent password hashing library.
- Validate all untrusted input on the server.
- Enforce authorization on the server, not only in the UI.
- Keep secrets in environment variables.
- Do not expose stack traces, secrets, tokens, or internal errors to users.
- If using cookies, configure HttpOnly, SameSite, Secure, path, and expiration appropriately.
- If using JWTs, set expiration and sign with a server-only secret.
- Use secure defaults for session expiration.
- Make admin-only actions require a server-side role check.
- Remove unused authentication methods and irrelevant sample code from the base material.

## README Requirements

README.md is part of the grading target. It must include:

- Application overview
- Technology stack
- Setup and run commands
- Test accounts, if needed for evaluation
- Authentication method used
- List of implemented authentication and authorization features
- Detailed confirmation steps for each feature
- Security design notes
- Screenshots or video links showing at least the main implemented features
- Known limitations or unfinished items

Do not rely on source code alone to communicate implemented behavior.

## Development Workflow

Before editing:

- Inspect package.json, app structure, routing, DB usage, auth code, and README.
- Identify the existing authentication approach.
- Decide whether to keep the current approach or replace it with a simpler secure one.

During implementation:

- Keep changes focused on assignment requirements.
- Build visible UI for each feature where practical.
- Keep server logic separate from client-only UI.
- Add clear error, loading, and empty states.
- Avoid adding large libraries unless they clearly reduce risk or complexity.

After implementation:

- Update README.md fully.
- Run available checks such as lint, typecheck, tests, and build.
- Report which checks passed and which could not be run.

## Definition Of Done

The task is complete when:

- Sign up, login, and logout work.
- At least two additional authentication or authorization features work.
- Implemented features are visible or otherwise easy to verify.
- Server-side validation and authorization are present.
- README.md clearly explains all implemented features and how to verify them.
- Screenshots or videos are referenced from README.md.
- Unused base-material code unrelated to the chosen auth approach is removed.
- The app builds successfully, or any build failure is clearly documented.

