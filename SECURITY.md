# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Avatar SDK, please report it responsibly.

**Email:** security@harmonica.chat

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues.

## Scope

This policy covers:
- The Avatar SDK codebase and its packages
- The corpus processing pipeline
- The Supabase schema and RLS policies
- The CAP protocol specification

## Known Considerations

- **API keys**: The processor requires OpenAI and Supabase service keys. These should never be committed to the repository. Use `.env` files (gitignored).
- **Corpus content**: Avatar responses are grounded in source documents. Malicious corpus content could lead to misleading responses.
- **RLS policies**: The Supabase schema uses row-level security. Changes to RLS should be reviewed carefully.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |
