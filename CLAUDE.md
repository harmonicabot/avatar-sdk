# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Avatar SDK** provides infrastructure for building knowledge avatars — AI agents grounded in verified source documents representing historical thinkers.

**Conversational Avatar Protocol (CAP)** is the open standard that allows avatars built with the SDK to be deployed on any platform supporting the protocol. Built on MCP (Model Context Protocol).

| Component | Purpose |
|-----------|---------|
| Avatar SDK | Build avatars: corpus processing, embeddings, persona definition |
| CAP | Deploy avatars: standard interface for platform integration |

**Primary integration platform:** Harmonica (structured deliberation sessions)

## Commands

```bash
npm run build     # Build all packages (Turbo)
npm run dev       # Development mode
npm run test      # Run tests
npm run lint      # Lint all packages
```

## Architecture

Turbo monorepo with workspaces:

```
packages/
├── core/               # Protocol specification
│   ├── avatar-schema.json   # JSON schema for avatar config
│   └── mcp-spec.md          # MCP tools specification
├── processor/          # Corpus → embeddings pipeline (planned)
└── mcp-server/         # Reference MCP server (planned)

avatars/
└── elinor-ostrom/      # First avatar
    ├── config.json          # Avatar configuration
    └── corpus/
        └── sources.json     # Open-access document URLs

supabase/
└── schema.sql          # Database schema (avatars, documents, chunks)
```

## Database (Supabase + pgvector)

Three tables in `supabase/schema.sql`:
- `avatars` — Metadata, system prompts, vector store config
- `avatar_documents` — Source document metadata (for transparency)
- `avatar_chunks` — Text chunks with `vector(1536)` embeddings

Similarity search via `search_avatar_chunks(avatar_id, query_embedding, limit, threshold)`.

## MCP Server Tools

Avatar servers expose three tools (see `packages/core/mcp-spec.md`):
- `query_corpus` — Semantic search, returns passages with similarity scores
- `generate_response` — Grounded response with citations from passages
- `get_avatar_info` — Avatar metadata (name, expertise, corpus size)

## Avatar Configuration

Avatars defined in `config.json` following `packages/core/avatar-schema.json`:

```json
{
  "id": "elinor-ostrom",
  "name": "Elinor Ostrom",
  "expertise": ["commons governance", "collective action"],
  "corpus": {
    "sources": [{ "title": "...", "url": "...", "verified": true }]
  },
  "systemPrompt": {
    "identity": "...",
    "tone": "...",
    "constraints": ["Only cite actual research", "Acknowledge limitations"],
    "citationStyle": "First person past tense"
  },
  "vectorStore": {
    "embeddingModel": "text-embedding-3-small",
    "chunkSize": 512
  }
}
```

## Critical Avatar Constraints

All avatars must:
- Only cite actual research from their corpus
- Acknowledge limitations and time period ("I didn't study digital commons")
- Never invent positions on uncovered topics
- Use first-person past tense for citations ("In my research on Nepal...")

## Corpus Management

Source documents tracked in `avatars/[name]/corpus/sources.json`:
- URLs to open-access PDFs (committed to repo)
- Actual PDFs downloaded to `corpus/open-access/` (gitignored)
- Embeddings stored in Supabase (not in repo)

Copyrighted works (e.g., "Governing the Commons") are listed in `excluded_sources` with reason.

## Adding New Avatars

1. Create `avatars/[avatar-name]/config.json` following the schema
2. Add corpus sources to `avatars/[avatar-name]/corpus/sources.json`
3. Process documents into embeddings (pipeline in `packages/processor/`)
4. Insert into Supabase `avatar_chunks` table
