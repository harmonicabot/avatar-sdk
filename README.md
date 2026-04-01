# Avatar SDK

> **Status: Alpha (v0.1.0)** — Under active development. APIs may change.

Infrastructure for building knowledge avatars grounded in verified source documents.

> "Like having a well-read student of the expert in your conversation — one who can quickly find and interpret relevant passages."

## What is Avatar SDK?

Avatar SDK provides the tools to create **knowledge avatars** — AI agents that serve as "students" of thinkers and authors, grounded in their documented writings. Rather than pretending to *be* the expert, avatars speak in their own voice while drawing on verified source material. The SDK handles:

- **Corpus management** — Ingest, chunk, and embed source documents (PDFs, markdown, books, papers, newsletters)
- **Vector storage** — Store embeddings in Supabase with pgvector for semantic retrieval
- **Grounded responses** — Generate responses that cite specific sources, never inventing positions

## What is the Conversational Avatar Protocol (CAP)?

**CAP** is an open standard that allows avatars built with the SDK to be deployed on any platform that supports the protocol. While traditional chatbots answer isolated queries, CAP-compliant avatars participate in ongoing group conversations.

| Component | What it does |
|-----------|--------------|
| **Avatar SDK** | Build avatars: process corpora, generate embeddings, define personas |
| **CAP** | Deploy avatars: standard interface for platforms to integrate avatars |

Built on [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), CAP enables platforms like Harmonica to integrate knowledge avatars into community conversations.

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
│   ├── core/                    # Protocol specification
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
- Build platform integrations
- Improve processing pipeline

## License

MIT License — See [LICENSE](./LICENSE)

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md).

