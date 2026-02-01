# Avatar SDK

> **Status: Alpha (v0.1.0)** — Under active development. APIs may change.

Infrastructure for building knowledge avatars grounded in verified source documents.

> "Like having a well-read student of the expert in your conversation — one who can quickly find and interpret relevant passages."

## What is Avatar SDK?

Avatar SDK provides the tools to create **knowledge avatars** — AI agents that serve as "students" of historical thinkers, grounded in their documented writings. Rather than pretending to *be* the expert, avatars speak in their own voice while drawing on verified source material. The SDK handles:

- **Corpus management** — Ingest, chunk, and embed source documents (books, papers, speeches)
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

1. **Verified Corpus** — Digitized writings, speeches, and documented positions
2. **Vector Store** — Embeddings stored in Supabase (pgvector) for semantic retrieval
3. **System Prompt** — Defines how the avatar engages (tone, citation style, limitations)
4. **MCP Server** — Standard protocol for querying the avatar

When a topic arises in conversation, the avatar:
1. Retrieves relevant passages from its corpus
2. Offers its interpretation grounded in the source material
3. Cites the expert directly (e.g., "This quote from Ostrom seems relevant: ...")
4. Speaks in its own voice as another participant making sense of the material

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
│   │       ├── chunk.ts         # Text → token-aware chunks
│   │       ├── embed.ts         # Chunks → OpenAI embeddings
│   │       └── ingest.ts        # Embeddings → Supabase
│   │
│   └── mcp-server/              # Reference MCP server [planned]
│
├── avatars/
│   └── elinor-ostrom/           # First avatar
│       ├── config.json          # Avatar configuration
│       └── corpus/
│           ├── sources.json     # Source metadata + URLs
│           └── open-access/     # Downloaded PDFs (gitignored)
│
├── supabase/
│   └── schema.sql               # Database schema
│
└── docs/
    └── protocol.md
```

## Current Avatar: Elinor Ostrom

Nobel laureate in economics, studied how communities successfully self-govern common resources.

**Expertise:** Commons governance, polycentric systems, collective action, institutional design

**Corpus (352 chunks across 3 documents):**
- *Sustaining the Commons* (Anderies & Janssen, 2016) — Textbook covering Ostrom's frameworks
- *Beyond Markets and States* (Ostrom, 2009) — Nobel Prize lecture
- *Updated Guide to IAD* (McGinnis, 2011) — IAD framework guide

**Use cases:**
- Community land trusts discussing allocation
- DAOs designing governance structures
- Cooperatives managing shared resources

## Quick Start

### Processing a Corpus

```bash
# Install dependencies
npm install

# Download PDFs to avatars/elinor-ostrom/corpus/open-access/

# Dry run (extract + chunk, no API calls)
npx tsx packages/processor/src/index.ts --avatar elinor-ostrom --dry-run

# Full run (requires SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY)
npx tsx packages/processor/src/index.ts --avatar elinor-ostrom

# Process single source
npx tsx packages/processor/src/index.ts --avatar elinor-ostrom --source nobel-lecture-2009

# Re-process (clears existing chunks first)
npx tsx packages/processor/src/index.ts --avatar elinor-ostrom --source nobel-lecture-2009 --force
```

### Platform Integration (Harmonica)

```
Session: "Community Garden Governance"

Facilitator: "What's your main concern about the garden?"
Participant: [shares concern about resource allocation]
Facilitator: "Would you like to consult Ostrom's Student about this?"
Participant: "Yes"

Ostrom's Student: "I think this comes down to matching benefits
with contributions. Ostrom studied irrigation systems in Nepal
that faced similar challenges. She found that communities succeeded
when they had clear boundaries and proportional equivalence —
here's a relevant passage: '...those who benefit from the resource
should contribute proportionally to its maintenance...'"
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
  'elinor-ostrom',
  $query_embedding,
  5  -- top 5 results
);
```

See [`supabase/schema.sql`](./supabase/schema.sql) for full schema.

## Why Historical Figures?

1. **Legal clarity** — Writings in public domain or open access
2. **Cultural consensus** — Time for historical evaluation
3. **Completed corpus** — No evolving positions to track
4. **Less controversy** — Prove concept before contemporary figures

## Technical Stack

- **Monorepo:** Turbo
- **Database:** Supabase (PostgreSQL + pgvector)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **PDF Processing:** pdf-parse + gpt-tokenizer
- **LLM:** Claude (Anthropic)
- **Protocol:** MCP (Model Context Protocol)

## Ethics & Safety

### The "Student" Framing

Avatars speak in their own voice as participants who have deeply studied the source material — not as the historical figure themselves. This is intentional:

- **Honest representation** — The AI is interpreting and synthesizing, not channeling
- **Clear attribution** — Quotes are clearly marked as coming from the expert
- **Appropriate humility** — The avatar is "making sense of" the material, just like any other participant

### What This Is Not
- Not "bringing back the dead" or pretending to be the person
- Not inventing positions they never held
- Not replacing primary sources — encouraging engagement with them

### Safeguards
- All source documents publicly verifiable
- Direct quotes clearly attributed to the expert
- Avatar speaks as interpreter, not as the expert
- Clear labeling as AI representation ("Ostrom's Student")

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

## Links

- [Protocol Specification](./packages/core/mcp-spec.md)
- [Harmonica](https://harmonica.chat) — Primary integration platform

---

*"Like having a diligent student of Elinor Ostrom in your community meeting — one who can quickly find relevant passages and offer interpretations grounded in her actual writings."*
