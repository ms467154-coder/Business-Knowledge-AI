# Security Policy

## Reporting a vulnerability

Please do not publish security-sensitive details in a public issue. Report the issue privately to the repository owner with a clear description, affected component, reproduction steps, and any available mitigation. Avoid including credentials, access tokens, user data, or textbook files in the report.

## Secret-handling policy

The project must never commit `.env` files, Forge credentials, OAuth secrets, database URLs, session tokens, or other private configuration. If a secret is exposed, revoke or rotate it immediately and remove it from every affected environment and commit history before publishing a remediation.

## Source-data policy

The OpenStax source PDF is intentionally excluded from Git. Security reports and pull requests should use only official source links, public metadata, or redacted excerpts where necessary.
