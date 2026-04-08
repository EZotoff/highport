# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in Highport, please report it responsibly.

**Do NOT open a public GitHub issue.**

Instead, please open a private GitHub Security Advisory for this repository. If a dedicated security contact email is published later, use that channel as an alternative.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

| Stage                      | Target                  |
| -------------------------- | ----------------------- |
| Acknowledgment             | Within 48 hours         |
| Initial assessment         | Within 5 business days  |
| Fix timeline communication | Within 10 business days |

### Scope

- The Highport application (web frontend, server, RAG service)
- Dependencies with known vulnerabilities
- Authentication/authorization issues
- Data exposure risks

### Out of Scope

- Issues in third-party services not controlled by this project
- Social engineering attacks
- Denial of service (DoS)

## Security Best Practices for Contributors

- Never commit `.env` files, API keys, or secrets
- Use `.env.example` files for documenting required environment variables
- Report any accidentally committed secrets immediately
- Run `pnpm lint` and `pnpm typecheck` before submitting PRs
