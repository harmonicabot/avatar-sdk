# Avatar SDK

**Conversational Avatar Protocol (CAP)** — Bring historical experts into your group discussions.

> "Making expert knowledge as accessible in group conversations as having the expert in the room."

## What is Avatar SDK?

Avatar SDK implements the **Conversational Avatar Protocol** — an open standard for bringing knowledge avatars into group discussions. Unlike traditional chatbots that answer individual queries, conversational avatars participate in ongoing discussions, understand group context, and contribute when relevant.

Built on [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), Avatar SDK enables any platform to integrate experts like Elinor Ostrom, Gandhi, or Thomas Paine into their community conversations.

## The Conversational Difference

| Traditional Chatbots | Conversational Avatars |
|---------------------|------------------------|
| You ask → It answers | Group discusses → Avatar participates |
| One-on-one interaction | Multi-party dialogue |
| Stateless queries | Conversation-aware |
| Like a search engine | Like having an expert in the room |

## How It Works

Each avatar consists of:

1. **Verified Corpus** — Digitized writings, speeches, and documented positions
2. **Vector Store** — Embeddings stored in Supabase (pgvector) for semantic retrieval
3. **System Prompt** — Defines how the avatar engages (tone, citation style, limitations)
4. **MCP Server** — Standard protocol for querying the avatar

When a topic arises in conversation, the avatar:
1. Retrieves relevant passages from its corpus
2. Grounds its response in documented positions
3. Cites specific sources (e.g., "As I wrote in Governing the Commons...")
4. Acknowledges limitations ("I didn't study digital commons extensively")

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
Facilitator: "Would you like to consult Ostrom about this?"
Participant: "Yes"

Ostrom: "The irrigation systems I studied in Nepal faced
similar allocation challenges. The communities that succeeded
had clear boundaries and proportional equivalence between
benefits and costs..."
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

## Two Economic Models

### Official Avatars (We Host)
- Curated, verified avatars like Ostrom
- Hosted on Avatar SDK infrastructure
- Users pay for LLM usage via credits
- Goal: Public good, grant-funded

### BYOI — Bring Your Own Infrastructure
- You host your own Supabase project + MCP server
- You bring your own LLM API keys
- Zero cost from us
- Full control over your data

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Add documents to official avatar corpora
- Create new avatar configurations
- Build platform integrations
- Improve processing pipeline
- Write documentation

## Ethics & Safety

### What This Is
Making documented research and writings searchable and conversational within group discussions.

### What This Is Not
- Not "bringing back the dead"
- Not inventing positions they never held
- Not replacing primary sources

### Safeguards
- All source documents publicly verifiable
- Responses cite specific sources
- Avatars acknowledge limitations
- Clear labeling as AI representations

## License

MIT License — See [LICENSE](./LICENSE)

## Links

- [Documentation](./docs/)
- [Protocol Specification](./packages/core/mcp-spec.md)
- [Harmonica](https://harmonica.chat) — Primary integration platform

---

*"Like having Elinor Ostrom in your community meeting, grounded in everything she actually wrote."*
