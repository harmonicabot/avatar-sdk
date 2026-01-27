# Conversational Avatar Protocol (CAP)

## Overview

The Conversational Avatar Protocol defines how knowledge avatars participate in group discussions. Built on [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), CAP extends MCP with conversation-aware capabilities.

## Core Concepts

### Avatar
A knowledge avatar is an AI agent grounded in a verified corpus of documents representing a historical figure's or expert's documented positions.

### Corpus
The complete set of verified source documents (books, papers, speeches, etc.) that define what an avatar "knows."

### Grounded Response
A response that draws directly from retrieved passages in the corpus, not from general LLM knowledge.

## Protocol Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Platform (Harmonica, Slack, etc.)    │
└─────────────────────────────────────────────────────────┘
                            │
                            │ 1. Query with conversation context
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Avatar MCP Server                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Retrieve   │→ │   Rank &    │→ │    Generate     │ │
│  │  Passages   │  │   Filter    │  │    Response     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                                    │          │
│         ▼                                    ▼          │
│  ┌─────────────┐                    ┌─────────────────┐│
│  │   Qdrant    │                    │   Claude API    ││
│  │Vector Store │                    │                 ││
│  └─────────────┘                    └─────────────────┘│
└─────────────────────────────────────────────────────────┘
                            │
                            │ 2. Grounded response with citations
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Platform                              │
└─────────────────────────────────────────────────────────┘
```

## MCP Tools

An Avatar MCP Server exposes these tools:

### `query_corpus`
Retrieve relevant passages from the avatar's corpus.

**Input:**
```json
{
  "query": "How should we handle free-riders?",
  "context": "We're a community garden with 30 members...",
  "max_results": 5
}
```

**Output:**
```json
{
  "passages": [
    {
      "content": "In the irrigation communities I studied...",
      "source": "Governing the Commons",
      "page": 94,
      "relevance_score": 0.89
    }
  ]
}
```

### `generate_response`
Generate a grounded response using retrieved passages.

**Input:**
```json
{
  "passages": [...],
  "conversation_context": [...],
  "question": "How should we handle free-riders?"
}
```

**Output:**
```json
{
  "response": "In my research on irrigation systems in Nepal...",
  "citations": [
    {"source": "Governing the Commons", "page": 94}
  ]
}
```

### `get_avatar_info`
Return metadata about the avatar.

**Output:**
```json
{
  "id": "elinor-ostrom",
  "name": "Elinor Ostrom",
  "description": "...",
  "expertise": ["commons governance", ...],
  "corpus_summary": "Based on writings 1965-2012"
}
```

## Conversation Context

Unlike simple RAG systems, CAP avatars receive conversation context:

```json
{
  "conversation": [
    {"role": "alice", "content": "We need to decide on bike storage..."},
    {"role": "bob", "content": "Maybe first-come first-served?"},
    {"role": "carol", "content": "But then people who work late shifts are screwed."}
  ],
  "session_metadata": {
    "topic": "Community Resource Allocation",
    "participant_count": 12,
    "platform": "harmonica"
  }
}
```

This allows avatars to:
- Understand the flow of discussion
- Reference what participants said
- Provide contextually relevant contributions

## Verification Requirements

All avatars must provide:

1. **Source Transparency**
   - Public list of all corpus documents
   - Original URLs or archive links
   - Verification status for each document

2. **Clear Attribution**
   - Responses must cite specific sources
   - Avatar must be clearly labeled as AI

3. **Limitation Acknowledgment**
   - Avatar must acknowledge knowledge boundaries
   - Must not invent positions on uncovered topics

## Platform Integration

### Harmonica (Recommended for MVP)
Structured sessions with explicit avatar consultation.

```typescript
// Harmonica integration
const session = await harmonica.createSession({
  topic: "Community Governance",
  avatars: ["elinor-ostrom"],
  facilitator: "default"
});

// During 1:1 dialogue
await session.consultAvatar("elinor-ostrom", {
  participant: participantId,
  context: dialogueHistory
});
```

### Slack/Discord (Future)
Mention-based or slash-command invocation.

```typescript
// Slack integration (future)
app.command('/ask-ostrom', async ({ command, ack, respond }) => {
  await ack();
  const response = await avatarClient.query({
    avatar: 'elinor-ostrom',
    question: command.text,
    context: await getChannelContext(command.channel_id)
  });
  await respond(response);
});
```

## Error Handling

### Corpus Miss
When no relevant passages are found:
```json
{
  "response": "I don't have specific research on [topic]. However, based on similar cases I studied...",
  "confidence": "low",
  "suggestion": "You might want to consult other sources on this specific topic."
}
```

### Out of Scope
When query is outside avatar's expertise:
```json
{
  "response": "This falls outside my area of research. My work focused on [expertise areas].",
  "redirect": "Consider consulting an avatar specializing in [suggested area]."
}
```

## Security Considerations

1. **No PII in Corpus** - Avatars should not contain private information
2. **Rate Limiting** - Prevent abuse of avatar queries
3. **Audit Logging** - Track all avatar interactions
4. **Content Filtering** - Prevent misuse for generating harmful content
