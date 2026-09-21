# Avatar SDK

> **Status: Historical alpha (v0.1.0)** - Harmonica-owned implementation and learning surface. APIs may change.

> [!IMPORTANT]
> This repository does not define the canonical Conversational Avatar Protocol (CAP). Its protocol documents record an early MCP-based proposal and are non-normative. CAP is now in [pre-spec incubation under Citizen Infra](https://github.com/Citizen-Infra/conversational-avatar-protocol). Future active work in this repository is scoped to Harmonica integrations and experiments; a cross-platform CAP SDK would be a separate, evidence-led project.

Infrastructure for building knowledge avatars grounded in verified source documents.

> "Like having a well-read student of the expert in your conversation — one who can quickly find and interpret relevant passages."

## What is Avatar SDK?

Avatar SDK provides the tools to create **knowledge avatars** — AI agents that serve as "students" of thinkers and authors, grounded in their documented writings. Rather than pretending to *be* the expert, avatars speak in their own voice while drawing on verified source material. The SDK handles:

- **Corpus management** — Ingest, chunk, and embed source documents (PDFs, markdown, books, papers, newsletters)
- **Vector storage** — Store embeddings in Supabase with pgvector for semantic retrieval
- **Grounded responses** — Generate responses that cite specific sources, never inventing positions

## What is the Conversational Avatar Protocol (CAP)?

The CAP material in this repository records an early proposal for conversation-aware avatars built on [MCP (Model Context Protocol)](https://modelcontextprotocol.io/). It is historical implementation material, not the current protocol definition or a conformance claim.

| Component | What it does |
|-----------|--------------|
| **Avatar SDK** | Harmonica-owned corpus, retrieval, persona, and integration experiments |
| **CAP material in this repository** | Historical MCP-based proposal; non-normative |
| **Citizen Infra CAP repository** | Current public pre-spec incubation and pilot-evidence surface |

The SDK may inform or implement a future Harmonica CAP binding, but its current storage, model, corpus, persona, and MCP choices are not CAP requirements.

## The Conversational Difference

| Traditional Chatbots | Conversational Avatars |
|---------------------|------------------------|
| You ask → It answers | Group discusses → Avatar participates |
| One-on-one interaction | Multi-party dialogue |
| Stateless queries | Conversation-aware |
| Like a search engine | Like a knowledgeable participant who's read all the sources |

## How It Works

Each avatar consists of:

1. **Verified Corpus** — Source documents: books, papers, newsletters, speeches
2. **Vector Store** — Embeddings stored in Supabase (pgvector) for semantic retrieval
3. **System Prompt** — Defines how the avatar engages (tone, citation style, limitations)

When a topic arises in conversation, the avatar:
1. Retrieves relevant passages from its corpus via semantic search
2. Offers its interpretation grounded in the source material
3. Cites the expert directly with post/paper titles
4. Speaks in its own voice as a student making sense of the material

## Provenance: current state

**Retrieval is recorded; attribution is not.** "How It Works" above describes the design intent. This section describes what the reference implementation does, because the two differ in a way that matters to anyone relying on a citation. Verified 2026-09-21 against `packages/mcp-server/src/index.ts`, `packages/core/mcp-spec.md` and `docs/protocol.md`.

**Scope.** This is about the avatar model this repository describes: source-grounded entities meant to take part in deliberation on platforms that support CAP. The Telegram bots listed under Current Avatars are simple question-answering bots that share this repository's corpus and retrieval layer. They are not implementations of that model, so their prompt design and output format are product choices for those bots and say nothing about how an avatar here should behave.

### What is a record

Which passages were available to a response. `query_corpus` returns each chunk with `source_title`, `source_page` and `source_year`, and `generate_response` returns the `retrieved_passages` it supplied. That is deterministic and reproducible from the query.

### What is the model's claim

Which passage supports which sentence. Nothing in the reference implementation links a statement to the passage it rests on. `generate_response` does not generate a response: it returns a system prompt plus passages and leaves the answer, and its citations, to the calling LLM, instructed to "Cite sources by title".

So a citation is the model's account of its own output. It can name a passage that was not used, or leave out one that was, and nothing downstream can tell.

### Known gaps

- **`generate_response` drops the page.** Its row type omits `source_page`, although `query_corpus` returns it. A citation can name a title, never a location.
- **Both specs describe an output that does not exist.** `packages/core/mcp-spec.md` specifies `generate_response` as returning `response`, `citations: [{source, page, quote}]` and `confidence`; `docs/protocol.md` shows `response` and `citations: [{source, page}]`. None of these fields is implemented. Both documents are historical (see Ownership in `CLAUDE.md`), but a reader has no way to know the examples are unimplemented. The `confidence` field in particular should not be implemented as specified: it is model-reported confidence, which the CAP evidence-envelope candidate linked below rejects.
- **The similarity threshold is inconsistent.** `query_corpus` advertises a default of 0.3 in its input schema but falls back to 0.7 when the argument is omitted, and `generate_response` hardcodes 0.65 with no parameter.

### Why it matters, and what would fix it

Asking a model to justify its own output produces a new prediction rather than an account of how the output was made (Théophile Pénigaud, ["Orphan Reasons"](https://informationaldemocracy.substack.com/p/orphan-reasons-who-is-responsible), Informational Democracy, 2026-09-01). A citation written by the model in the same pass is that kind of justification.

The fix is structural rather than a better prompt: derive citations from the retrieval record and return them alongside the text, instead of asking the model to write them into it. [`Citizen-Infra/conversational-avatar-protocol#4`](https://github.com/Citizen-Infra/conversational-avatar-protocol/issues/4) proposes exactly that separation for CAP, with model-reported confidence explicitly rejected. The reference server here is a concrete case of the gap it addresses.

*Revised 2026-09-21: the first version of this section treated the two Telegram bots as deployed consumers of the avatar model and listed gaps in their prompts. They are separate, simpler products; those points were removed.*

## Current Avatars

### Ostrom's Corpus

Elinor Ostrom won a Nobel prize in economics for studying how communities successfully self-govern common resources.

**Corpus:** 352 chunks across 3 documents (academic papers, textbook)
- *Sustaining the Commons* (Anderies & Janssen, 2016)
- *Beyond Markets and States* (Ostrom, 2009) — Nobel Prize lecture
- *Updated Guide to IAD* (McGinnis, 2011)

### Lenny's Corpus

Lenny Rachitsky is the author of [Lenny's Newsletter](https://www.lennysnewsletter.com/).

**Corpus:** 5,003 chunks across 349 newsletter posts (2019-2025)
- Product management, growth strategy, retention benchmarks
- B2B/B2C, marketplace dynamics, hiring, pricing
- Guest contributor insights attributed to their original source

Built for Lenny's MCP server. Try it: [@lennys_avatar_bot](https://t.me/lennys_avatar_bot) on Telegram.

## Architecture

```
avatar-sdk/
├── packages/
│   ├── core/                    # Historical protocol assets and avatar schema
│   │   ├── avatar-schema.json   # JSON Schema for avatar configs
│   │   └── mcp-spec.md         # MCP tools specification
│   │
│   ├── processor/               # Corpus → embeddings pipeline
│   │   └── src/
│   │       ├── index.ts         # CLI entry point
│   │       ├── extract.ts       # PDF → per-page text
│   │       ├── extract-markdown.ts  # Markdown → text (strips frontmatter)
│   │       ├── chunk.ts         # Text → token-aware chunks
│   │       ├── embed.ts         # Chunks → OpenAI embeddings
│   │       └── ingest.ts        # Embeddings → Supabase
│   │
│   └── mcp-server/              # Reference MCP server
│       └── src/
│           └── index.ts         # query_corpus, generate_response, get_avatar_info
│
├── avatars/
│   ├── elinor-ostrom/           # Historical figure — academic papers
│   │   ├── config.json
│   │   └── corpus/
│   │       ├── sources.json
│   │       └── open-access/     # Downloaded PDFs (gitignored)
│   │
│   └── lenny-rachitsky/         # Living author — newsletter archive
│       ├── config.json
│       └── corpus/
│           └── sources.json     # Points to external corpus via corpus_root
│
└── supabase/
    └── schema.sql               # Database schema
```

## Quick Start

### Processing a PDF Corpus

```bash
npm install

# Download PDFs to avatars/elinor-ostrom/corpus/open-access/

# Dry run (extract + chunk, no API calls)
node --env-file=.env --import tsx packages/processor/src/index.ts --avatar elinor-ostrom --dry-run

# Full run (requires SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY in .env)
node --env-file=.env --import tsx packages/processor/src/index.ts --avatar elinor-ostrom
```

### Processing a Markdown Corpus

```bash
# Set corpus_root in sources.json to point to your markdown files
# Each source needs: format: "markdown", path: "relative/path/to/file.md"

node --env-file=.env --import tsx packages/processor/src/index.ts --avatar lenny-rachitsky --dry-run
# → 349 files, 5,003 chunks, 2.18M tokens

node --env-file=.env --import tsx packages/processor/src/index.ts --avatar lenny-rachitsky
```

## Data Model (Supabase + pgvector)

```sql
-- Avatar definition
create table avatars (
  id text primary key,
  name text not null,
  description text,
  expertise text[],
  system_prompt jsonb not null,
  is_active boolean default true,
  is_official boolean default false
);

-- Source documents (for transparency)
create table avatar_documents (
  id uuid primary key,
  avatar_id text references avatars(id),
  title text not null,
  url text,
  document_type text,
  verified boolean default false,
  processed boolean default false
);

-- Text chunks with embeddings
create table avatar_chunks (
  id uuid primary key,
  avatar_id text references avatars(id),
  content text not null,
  embedding vector(1536),
  source_title text,
  source_page int
);

-- Similarity search function
select * from search_avatar_chunks(
  'lenny-rachitsky',
  $query_embedding,
  5  -- top 5 results
);
```

See [`supabase/schema.sql`](./supabase/schema.sql) for full schema.

## What Makes a Good Avatar Source?

Avatar SDK works for any author or body of knowledge with:

1. **Substantive corpus** — Enough written material to ground meaningful responses (hundreds of pages or posts)
2. **Clear attribution** — Sources that can be cited by title, author, and date
3. **Coherent perspective** — A recognizable voice, methodology, or framework
4. **Appropriate licensing** — Public domain, open access, or personal use rights for the corpus

Historical figures (completed corpus, public domain) and living authors who release their work as data (like Lenny's newsletter archive) both work well.

## Technical Stack

- **Monorepo:** Turbo
- **Database:** Supabase (PostgreSQL + pgvector)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **Document Processing:** pdf-parse (PDFs) + YAML frontmatter stripping (markdown) + gpt-tokenizer (chunking)
- **Protocol:** MCP (Model Context Protocol)

## Ethics & Safety

### The "Student" Framing

Avatars speak in their own voice as participants who have deeply studied the source material — not as the author themselves. This is intentional:

- **Honest representation** — The AI is interpreting and synthesizing, not channeling
- **Clear attribution** — Quotes are clearly marked as coming from the expert
- **Appropriate humility** — The avatar is "making sense of" the material, just like any other participant
- **Time-bounded** — For living authors, the avatar notes the date range of its knowledge

### Safeguards
- All source documents verifiable
- Direct quotes clearly attributed to the expert
- Avatar speaks as interpreter, not as the expert
- Clear labeling as AI representation ("Student of...")
- Guest contributors and co-authors attributed separately

## Live Demos

- [@lennys_avatar_bot](https://t.me/lennys_avatar_bot) — Student of Lenny's Corpus (Telegram)
- [@jtbd_avatar_bot](https://t.me/jtbd_avatar_bot) — Student of Moesta & Kalbach (Telegram)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

- Add documents to official avatar corpora
- Create new avatar configurations
- Build Harmonica integrations
- Improve processing pipeline

## License

MIT License — See [LICENSE](./LICENSE)

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md).

