# Avatar SDK

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

Built on [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), CAP enables platforms like Harmonica, Slack, or Discord to integrate experts like Elinor Ostrom, Gandhi, or Thomas Paine into community conversations.

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
│   │   ├── mcp-spec.md
│   │   ├── avatar-schema.json
│   │   └── verification.md
│   │
│   ├── processor/               # Corpus → embeddings pipeline
│   │   ├── chunk.ts
│   │   ├── embed.ts
│   │   └── verify.ts
│   │
│   └── mcp-server/              # Reference MCP server
│       └── server.ts
│
├── supabase/                    # Database schema
│   └── schema.sql
│
├── avatars/                     # Official curated avatars
│   ├── elinor-ostrom/
│   ├── gandhi/
│   └── thomas-paine/
│
├── templates/                   # For creating your own
│   └── avatar-template/
│
└── docs/
    ├── protocol.md
    ├── creating-avatars.md
    └── integration-guide.md
```

## Official Avatars

### Elinor Ostrom (First Avatar)
Nobel laureate in economics, studied how communities successfully self-govern common resources.

**Expertise:** Commons governance, polycentric systems, collective action, institutional design

**Corpus:** "Governing the Commons" (1990), "Understanding Institutional Diversity" (2005), major academic papers

**Use cases:**
- Community land trusts discussing allocation
- DAOs designing governance structures
- Cooperatives managing shared resources

### Coming Soon
- **Mahatma Gandhi** — Nonviolent resistance, village self-governance, swaraj
- **Thomas Paine** — Revolutionary democracy, rights of man
- **Mary Parker Follett** — Integrative decision-making, industrial democracy
- **Peter Kropotkin** — Mutual aid, decentralized organization

## Platform Integrations

Avatar SDK is designed to work with any platform. Current focus:

### Harmonica (Primary)
Structured deliberation sessions with 1:1 dialogues. Participants can consult avatars during facilitated discussions.

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

### Future Platforms
- Slack (via bot mentions)
- Discord (via slash commands)
- Custom integrations via MCP

## Quick Start

### Using an Official Avatar

```typescript
import { AvatarClient } from '@avatar-sdk/client';

const ostrom = new AvatarClient({
  avatar: 'elinor-ostrom',
  apiKey: process.env.AVATAR_SDK_KEY
});

const response = await ostrom.query({
  context: conversationHistory,
  question: "How should we handle free-riders in our community garden?"
});
```

### Creating Your Own Avatar

```bash
# Install CLI
npm install -g @avatar-sdk/cli

# Initialize new avatar
avatar-sdk init my-avatar

# Add documents to corpus
avatar-sdk add ./documents/*.pdf

# Process and embed
avatar-sdk process

# Test locally
avatar-sdk serve
```

## Data Model (Supabase)

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
  verified boolean default false
);

-- Text chunks with embeddings
create table avatar_chunks (
  id uuid primary key,
  avatar_id text references avatars(id),
  content text not null,
  embedding vector(1536),  -- pgvector
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

## Why Start with Historical Figures?

1. **Legal clarity** — Writings in public domain
2. **Cultural consensus** — Time for historical evaluation
3. **Completed corpus** — No evolving positions to track
4. **Less controversy** — Prove concept before contemporary figures

**Roadmap:**
- Historical figures (public domain)
- 20th century thinkers (deceased 20+ years)
- Contemporary experts (with careful protocols)
- User-generated avatars (BYOI — Bring Your Own Infrastructure)

## Technical Stack

- **Database:** Supabase (PostgreSQL + pgvector)
- **Embeddings:** OpenAI text-embedding-3-small
- **LLM:** Claude (Anthropic)
- **Protocol:** MCP (Model Context Protocol)
- **Processing:** LlamaIndex

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Add documents to official avatar corpora
- Create new avatar configurations
- Build platform integrations
- Improve processing pipeline
- Write documentation

## Ethics & Safety

### The "Student" Framing

Avatars speak in their own voice as participants who have deeply studied the source material — not as the historical figure themselves. This is intentional:

- **Honest representation** — The AI is interpreting and synthesizing, not channeling
- **Clear attribution** — Quotes are clearly marked as coming from the expert
- **Appropriate humility** — The avatar is "making sense of" the material, just like any other participant

### What This Is
Making documented research and writings accessible within group discussions through an AI participant who has studied the material.

### What This Is Not
- Not "bringing back the dead" or pretending to be the person
- Not inventing positions they never held
- Not replacing primary sources — encouraging engagement with them

### Safeguards
- All source documents publicly verifiable
- Direct quotes clearly attributed to the expert
- Avatar speaks as interpreter, not as the expert
- Clear labeling as AI representation ("Ostrom's Student")

## License

MIT License — See [LICENSE](./LICENSE)

## Links

- [Documentation](./docs/)
- [Protocol Specification](./packages/core/mcp-spec.md)
- [Harmonica](https://harmonica.chat) — Primary integration platform

---

*"Like having a diligent student of Elinor Ostrom in your community meeting — one who can quickly find relevant passages and offer interpretations grounded in her actual writings."*
