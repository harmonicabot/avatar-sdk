# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avatar SDK implements the **Conversational Avatar Protocol (CAP)** — an open standard for bringing knowledge avatars (AI agents grounded in verified corpora) into group discussions. Unlike traditional RAG chatbots, these avatars participate in conversations, understand context, and cite specific sources.

**Primary integration platform:** Harmonica (structured deliberation sessions with 1:1 dialogues)

## Tech Stack

- **Database:** Supabase (PostgreSQL + pgvector)
- **Embeddings:** OpenAI text-embedding-3-small
- **LLM:** Claude (Anthropic)
- **Protocol:** MCP (Model Context Protocol)
- **Processing:** LlamaIndex
- **Build System:** Turbo (monorepo)

## Commands

```bash
npm run build     # Build all packages
npm run dev       # Development mode
npm run test      # Run tests
npm run lint      # Lint all packages
```

## Architecture

This is a Turbo monorepo with workspaces:

- `packages/*` — Core SDK packages
  - `packages/core/` — Protocol specification and avatar schema
  - `packages/processor/` — Corpus → embeddings pipeline (planned)
  - `packages/mcp-server/` — Reference MCP server implementation (planned)

- `supabase/` — Database schema
  - `supabase/schema.sql` — Tables for avatars, documents, chunks with pgvector

- `avatars/*` — Official curated avatars
  - `avatars/elinor-ostrom/` — First avatar (commons governance expert)

Each avatar has a `config.json` following the schema in `packages/core/avatar-schema.json`.

## Key Concepts

**Avatar:** AI agent grounded in a verified corpus representing a historical figure's documented positions.

**Corpus:** Verified source documents (books, papers, speeches) that define what an avatar "knows."

**Grounded Response:** Response drawn from retrieved corpus passages, not general LLM knowledge. Must cite sources.

## MCP Server Tools

Avatar MCP servers expose three tools:
- `query_corpus` — Retrieve relevant passages via Supabase pgvector similarity search
- `generate_response` — Generate grounded response with citations
- `get_avatar_info` — Return avatar metadata

## Database (Supabase)

Key tables in `supabase/schema.sql`:
- `avatars` — Avatar metadata and system prompts
- `avatar_documents` — Source document metadata (for transparency)
- `avatar_chunks` — Text chunks with `vector(1536)` embeddings

Similarity search via `search_avatar_chunks()` function.

## Avatar Configuration

Avatars are defined in `config.json` with:
- Identity and expertise areas
- Corpus sources with verification status
- System prompt (identity, tone, constraints, citation style)
- Vector store settings (Supabase table, embedding model, chunk size)

**Critical constraints for avatars:**
- Only cite actual research from the corpus
- Acknowledge limitations and time period
- Never invent positions on uncovered topics
- Use first-person past tense for citations

## Adding New Avatars

1. Create directory under `avatars/[avatar-name]/`
2. Add `config.json` following `packages/core/avatar-schema.json`
3. Add corpus documents to `corpus/` subdirectory
4. Process into embeddings and store in Supabase via `avatar_chunks` table
