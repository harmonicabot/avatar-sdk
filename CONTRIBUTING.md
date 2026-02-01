# Contributing to Avatar SDK

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project with pgvector enabled (for full pipeline testing)
- OpenAI API key (for embedding generation)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/harmonicabot/avatar-sdk.git
cd avatar-sdk

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY

# Build all packages
npm run build

# Run linting
npm run lint
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | For pipeline | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | For pipeline | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | For MCP server | Public read-only key |
| `OPENAI_API_KEY` | For embeddings | OpenAI API key |

## Ways to Contribute

- **Add corpus sources** — Find open-access documents for existing avatars
- **Create new avatars** — Follow the guide in [README.md](./README.md#architecture)
- **Improve the processor** — Better chunking, extraction, or embedding strategies
- **Build integrations** — Platform integrations using the CAP protocol
- **Documentation** — Improve docs, add examples, fix typos
- **Report bugs** — Open an issue with reproduction steps

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with clear commit messages
3. Ensure `npm run build` and `npm run lint` pass
4. Open a PR with a description of what changed and why

## Project Structure

```
packages/core/       — Protocol specification (schema, MCP spec)
packages/processor/  — Corpus processing pipeline
avatars/             — Avatar configurations and corpus metadata
supabase/            — Database schema
docs/                — Protocol documentation
```

## Code Style

- TypeScript strict mode
- ESLint + Prettier enforced via CI
- Commit messages: imperative mood, concise ("Add chunking tests", not "Added chunking tests")

## Security

To report a security vulnerability, see [SECURITY.md](./SECURITY.md).

## Questions?

Open a [GitHub Discussion](https://github.com/harmonicabot/avatar-sdk/discussions) or file an issue.
