# Security policy

## Supported version

Security fixes are prepared for the latest tagged release. Version 0.1.0 is a local-first static application with no application backend.

## Private reporting

Use the repository’s **Security → Report a vulnerability** flow so details remain private. Do not open a public issue for:

- data-loss or backup-corruption bugs
- unsafe import or validation bypasses
- path traversal or unintended file access
- cross-site scripting
- vulnerable dependencies
- accidental exposure of personal data

Include the affected version, browser/operating system, reproduction steps using synthetic data, expected behavior, and impact. Do not attach a real workspace export.

## Security boundaries

Workspace data is stored in browser IndexedDB and may be exported to user-chosen files. The application has no account or synchronization service. A user-authorized folder handle is retained in a separate browser database and cannot grant access beyond the chosen directory. URL references are restricted to HTTP and HTTPS before rendering as links.
