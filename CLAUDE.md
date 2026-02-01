# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Avatar SDK** — infrastructure for building knowledge avatars grounded in verified source documents. Avatars are AI agents that serve as "students" of historical thinkers, participating in group conversations with cited, grounded responses.

**Conversational Avatar Protocol (CAP)** — open standard (built on MCP) for deploying avatars on any platform. Primary integration: Harmonica.

## Commands

```bash
npm run build                    # Build all packages (Turbo)
npm run lint                     # ESLint (typescript-eslint, flat config)
npm run dev                      # Development mode
npm run test                     # Run tests

# Corpus processing
npx tsx packages/processor/src/index.ts --avatar <id>              # Process all primary sources
npx tsx packages/processor/src/index.ts --avatar <id> --dry-run    # Extract + chunk only, no API calls
npx tsx packages/processor/src/index.ts --avatar <id> --source <source-id>          # Single source
npx tsx packages/processor/src/index.ts --avatar <id> --source <source-id> --force  # Re-process (clears existing chunks)
```

## Code Style

- TypeScript strict mode, ESM (`"type": "module"`)
- ESLint flat config (`eslint.config.js`) with `typescript-eslint`; `@typescript-eslint/no-explicit-any` enforced — use typed catches and specific interfaces instead
- Prettier: single quotes, trailing commas, 100 char width (`.prettierrc`)
- CI runs lint + build on every PR (`.github/workflows/ci.yml`, Node 18+20 matrix)

## Architecture

Turbo monorepo (`packages/*` + `avatars/*` workspaces).

- **`packages/core/`** — Protocol specification: `avatar-schema.json` (JSON Schema for config), `mcp-spec.md` (MCP tools spec)
- **`packages/processor/`** — Corpus pipeline: PDF → extract (`pdf-parse`) → chunk (sentence-boundary-aware, `gpt-tokenizer`) → embed (OpenAI batched) → store (Supabase pgvector). All config-driven from avatar's `config.json` vectorStore settings.
- **`packages/mcp-server/`** — Reference MCP server (not yet implemented). Will expose `query_corpus`, `generate_response`, `get_avatar_info`.
- **`avatars/elinor-ostrom/`** — First avatar. `config.json` defines persona + vectorStore config, `corpus/sources.json` has source metadata + URLs, `corpus/open-access/` holds downloaded PDFs (gitignored).
- **`supabase/schema.sql`** — Three tables: `avatars`, `avatar_documents`, `avatar_chunks` (with `vector(1536)` + IVFFlat index). `search_avatar_chunks()` function for cosine similarity search. RLS: public read for official avatars, service role for writes.

## Database

Supabase project: `eoqfooswdwxiepblhvgb`. Current state: elinor-ostrom avatar with 352 chunks across 3 documents.

The `document_type` check constraint allows: book, paper, speech, interview, article, letter, textbook, guide, lecture.

## Processor Pipeline Details

Pipeline in `packages/processor/src/`:
- **config.ts** — Loads avatar config + sources.json, resolves PDF paths relative to repo root. `filterSources()` selects primary PDF sources.
- **extract.ts** — Per-page text extraction via pdf-parse's `pagerender` callback. Falls back to full text if page-level fails.
- **chunk.ts** — Sliding window over sentences. Accumulates until `chunkSize` tokens (default 512), steps back by `chunkOverlap` tokens (default 50) for next window. Token counting via `gpt-tokenizer` (cl100k_base).
- **embed.ts** — Batches of 100 chunks to OpenAI embeddings API. 3 retries with exponential backoff on 429/5xx.
- **ingest.ts** — Upserts document in `avatar_documents` (matched by avatar_id + title), inserts chunks in batches of 100. Idempotent: checks `processed` flag, skips unless `--force`.

## The "Student" Framing

Avatars speak as participants who studied the source material — not as the historical figure. They cite actual research, attribute quotes to the expert, acknowledge limitations, and never invent positions. This framing is enforced via `systemPrompt.constraints` in config.json.

## Environment Variables

Store in `.env` (gitignored):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Service role key (bypasses RLS, used by processor)
- `SUPABASE_ANON_KEY` — Public key (for read-only access, used by MCP server)
- `OPENAI_API_KEY` — For embedding generation

## Adding New Avatars

1. Create `avatars/[id]/config.json` following `packages/core/avatar-schema.json`
2. Create `avatars/[id]/corpus/sources.json` with source metadata (id, title, authors, url, priority, type)
3. Download PDFs to `avatars/[id]/corpus/open-access/[source-id].pdf`
4. Run processor: `npx tsx packages/processor/src/index.ts --avatar [id]`
5. Avatar record must exist in `avatars` table before processing (foreign key constraint)
