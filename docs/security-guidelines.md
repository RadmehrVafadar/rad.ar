# Security Guidelines

## API Authentication

- Store API keys in environment variables, never in source code
- Use unique keys per client or application
- Rotate keys periodically and revoke compromised keys
- Use `ENABLE_API_KEY_AUTH=true` in production

## Secrets Management

- Use `.env` files for local development (never commit them)
- Use Docker secrets or a vault (HashiCorp Vault, AWS Secrets Manager) in production
- Never log API keys or sensitive parameters

## Dependency Security

CI installs the locked dependencies and runs npm audit with audit-level=moderate, including development tools.
Node-based CI uses Node 22.23.1 to match the Mac Mini; .nvmrc records that version locally.
Run npm ci on the Mac after pulling a new lockfile so native modules are installed for that machine.
The low-severity [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) remains in Jest and webpack development tooling because no upstream patch exists.
It remains visible in audit reports; the CI threshold blocks moderate and higher findings without suppressing package advisories.
Nest CLI 12 treats webpack tooling as optional; the root development dependencies explicitly supply the repository's webpack builder and plugins.
The Nest application framework remains on version 11.
Compatibility tests verify locked Node engine requirements and the presence of macOS optional native binaries.
Use npm 10 when regenerating the lockfile and retain the platform-specific records for both Intel and Apple Silicon Macs.
Review transitive overrides during updates because old security pins can retain newly vulnerable releases.
The Upwork SDK uses the maintained Cypress request fork through an npm alias, retaining its callback API while replacing the abandoned request package.

## Per-Request Source Credentials

The API supports passing source-specific credentials (e.g., Upwork OAuth2 tokens) per-request via the `auth` field in `ScraperInputDto`. Keep these guidelines in mind:

- **Always use HTTPS** when sending credentials in request bodies to prevent interception
- **Prefer environment variables** for server deployments to avoid credentials appearing in request logs or network traces
- The API controller does **not** log auth credentials (only search term, sites, and location are logged)
- Auth data **is included in cache keys** — this is by design since different credentials may return different results
- Per-request credentials are held in memory only for the duration of the request and are not persisted
- See [Authentication](./authentication.md) for full details on per-request auth

## Network Security

- Deploy behind a reverse proxy (nginx, Caddy) with TLS/HTTPS
- Restrict `CORS_ORIGINS` to trusted domains in production
- Use firewall rules to limit access to the API port

## Vulnerability Reporting

See [SECURITY.md](../.github/SECURITY.md) for details on how to report vulnerabilities.
