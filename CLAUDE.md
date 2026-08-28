# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Avatar SDK** — infrastructure for building knowledge avatars grounded in verified source documents. Avatars are AI agents that serve as "students" of thinkers and authors, participating in conversations with cited, grounded responses. Works for both historical figures (Elinor Ostrom) and living authors (Lenny Rachitsky).

**Ownership boundary (2026-08-28)** - This is a Harmonica-owned implementation and historical learning surface. Its MCP-based CAP material is non-normative and does not define the canonical protocol. Current public pre-spec incubation lives in [Citizen-Infra/conversational-avatar-protocol](https://github.com/Citizen-Infra/conversational-avatar-protocol). Future active work here should serve Harmonica integrations or experiments; do not promote this repository into a platform-neutral CAP SDK.

## Commands

```bash
npm run build                    # Build all packages (Turbo)
npm run lint                     # ESLint (typescript-eslint, flat config)
npm run dev                      # Development mode
npm run test                     # Run tests

# Corpus processing — requires .env with OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
# Use node --env-file=.env --import tsx (npx tsx doesn't load .env)
node --env-file=.env --import tsx packages/processor/src/index.ts --avatar <id>              # Process all primary sources
node --env-file=.env --import tsx packages/processor/src/index.ts --avatar <id> --dry-run    # Extract + chunk only, no API calls
node --env-file=.env --import tsx packages/processor/src/index.ts --avatar <id> --source <source-id>          # Single source
node --env-file=.env --import tsx packages/processor/src/index.ts --avatar <id> --source <source-id> --force  # Re-process (clears existing chunks)
```

## Code Style

- TypeScript strict mode, ESM (`"type": "module"`)
- ESLint flat config (`eslint.config.js`) with `typescript-eslint`; `@typescript-eslint/no-explicit-any` enforced — use typed catches and specific interfaces instead
- Prettier: single quotes, trailing commas, 100 char width (`.prettierrc`)
- CI runs lint + build on every PR (`.github/workflows/ci.yml`, Node 18+20 matrix)

## Architecture

Turbo monorepo (`packages/*` + `avatars/*` workspaces).

- **`packages/core/`** — Historical protocol assets and avatar schema: `avatar-schema.json` (JSON Schema for config), `mcp-spec.md` (MCP tools spec)
- **`packages/processor/`** — Corpus pipeline: source → extract → chunk → embed → store. Supports both PDF (`extract.ts` via pdf-parse) and markdown (`extract-markdown.ts`, strips YAML frontmatter). Sentence-boundary-aware chunking (`gpt-tokenizer`), OpenAI batched embeddings, Supabase pgvector storage. Config-driven from avatar's `config.json` vectorStore settings.
- **`packages/mcp-server/`** — Reference MCP server implementing `query_corpus`, `generate_response`, `get_avatar_info`. Uses Server class from SDK v1. Queries Supabase `search_avatar_chunks` RPC. Built but not deployed — current consumers (Telegram bots) query Supabase directly.
- **`avatars/elinor-ostrom/`** — First avatar (historical). `config.json` defines persona + vectorStore config, `corpus/sources.json` has source metadata + URLs, `corpus/open-access/` holds downloaded PDFs (gitignored). 352 chunks across 3 documents.
- **`avatars/lenny-rachitsky/`** — Second avatar (living author). 349 newsletter posts processed from external corpus directory via `corpus_root` in sources.json. 5,003 chunks across 349 documents. Corpus lives in `../lennys-newsletterpodcastdata-all/` (paid subscriber archive, not redistributed).
- **`supabase/schema.sql`** — Three tables: `avatars`, `avatar_documents`, `avatar_chunks` (with `vector(1536)` + IVFFlat index). `search_avatar_chunks()` function for cosine similarity search. RLS: public read for official avatars, service role for writes.

## Database

Supabase project: `eoqfooswdwxiepblhvgb`.

Current state:
- **elinor-ostrom** — 352 chunks across 3 documents (academic papers/textbook)
- **lenny-rachitsky** — 5,003 chunks across 349 documents (newsletter posts)

The `document_type` check constraint allows: book, paper, speech, interview, article, letter, textbook, guide, lecture.

## Processor Pipeline Details

Pipeline in `packages/processor/src/`:
- **config.ts** — Loads avatar config + sources.json, resolves paths relative to repo root. `filterSources()` selects primary sources (PDF or markdown). `resolveCorpusRoot()` resolves external corpus directories from `corpus_root` field in sources.json.
- **extract.ts** — PDF extraction: per-page text via pdf-parse's `pagerender` callback. Falls back to full text if page-level fails.
- **extract-markdown.ts** — Markdown extraction: reads .md files, strips YAML frontmatter, returns content as a single page.
- **chunk.ts** — Sliding window over sentences. Accumulates until `chunkSize` tokens (default 512), steps back by `chunkOverlap` tokens (default 50) for next window. Token counting via `gpt-tokenizer` (cl100k_base).
- **embed.ts** — Batches of 100 chunks to OpenAI embeddings API. 3 retries with exponential backoff on 429/5xx.
- **ingest.ts** — Upserts document in `avatar_documents` (matched by avatar_id + title), inserts chunks in batches of 100. Idempotent: checks `processed` flag, skips unless `--force`.

## The "Student" Framing

Avatars speak as participants who studied the source material — not as the author themselves. They cite actual work, attribute quotes to the expert, acknowledge limitations, and never invent positions. This framing works for both historical figures and living authors. Enforced via `systemPrompt.constraints` in config.json.

For living authors: the avatar notes the date range of its knowledge and distinguishes between the author's own views and guest/contributor insights.

## Environment Variables

Store in `.env` (gitignored):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Service role key (bypasses RLS, used by processor)
- `SUPABASE_ANON_KEY` — Public key (for read-only access, used by MCP server)
- `OPENAI_API_KEY` — For embedding generation

## Adding New Avatars

1. Create `avatars/[id]/config.json` following `packages/core/avatar-schema.json`
2. Create `avatars/[id]/corpus/sources.json` with source metadata
   - For PDFs: set `format: "PDF"`, `url`, and `priority: "primary"`. Download PDFs to `avatars/[id]/corpus/open-access/[source-id].pdf`
   - For markdown: set `format: "markdown"`, `path` (relative to corpus_root), and `priority: "primary"`. Set `corpus_root` in sources.json to point to the external corpus directory.
3. Create avatar record in Supabase `avatars` table (foreign key constraint)
4. Run processor: `node --env-file=.env --import tsx packages/processor/src/index.ts --avatar [id]`

## Active Consumers

Two Telegram bots use avatar-sdk's Supabase vector store and avatar system prompts:
- **[Student of Lenny's Corpus](https://github.com/zhiganov/lennys-avatar-bot)** (`@lennys_avatar_bot`) — uses Lenny's official MCP for text search + our vector store for embeddings. Deployed on Railway.
- **[Student of Moesta & Kalbach](https://github.com/zhiganov/jtbd-avatar-bot)** (`@jtbd_avatar_bot`) — uses JTBD Knowledge MCP for structured content. Deployed on Railway.
