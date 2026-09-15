# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability. Contact the repository owner privately through the email address listed on the GitHub profile, including:

- a short description of the issue;
- affected endpoint, component, or deployment;
- reproducible steps or a minimal proof of concept;
- the potential impact.

Do not include API keys, passwords, private user data, or raw voice recordings in a report.

## Security notes

- Secrets belong in Render or Cloudflare environment settings, never in frontend source code.
- API authentication and multi-user authorization are not yet complete; treat the current public API as a demonstration deployment.
- Precise coordinates and voice input should be handled as sensitive user data.
- Official alert links should be preserved so users can verify warnings at the source.
