# MCP Specification for Avatar SDK

This document describes how Avatar SDK implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for conversational avatars.

## Overview

Avatar SDK uses MCP to expose avatar capabilities as tools that any MCP-compatible client can invoke. This allows platforms like Harmonica, Slack bots, or custom applications to integrate avatars without tight coupling.

## Tools

Avatar MCP servers expose three tools:

### `query_corpus`

Retrieve relevant passages from the avatar's corpus using semantic search.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query to find relevant passages"
    },
    "limit": {
      "type": "integer",
      "default": 5,
      "description": "Maximum number of passages to return"
    },
    "threshold": {
      "type": "number",
      "default": 0.7,
      "description": "Minimum similarity score (0-1)"
    }
  },
  "required": ["query"]
}
```

**Output:**
```json
{
  "passages": [
    {
      "content": "The text of the relevant passage...",
      "source": "Governing the Commons",
      "page": 42,
      "score": 0.89
    }
  ]
}
```

### `generate_response`

Generate a grounded response based on retrieved passages and conversation context.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "context": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": { "type": "string" },
          "content": { "type": "string" }
        }
      },
      "description": "Conversation history for context"
    },
    "question": {
      "type": "string",
      "description": "The current question or topic to respond to"
    },
    "passages": {
      "type": "array",
      "description": "Retrieved passages to ground the response"
    }
  },
  "required": ["question"]
}
```

**Output:**
```json
{
  "response": "As I discussed in my research on irrigation systems in Nepal...",
  "citations": [
    {
      "source": "Governing the Commons",
      "page": 42,
      "quote": "The relevant quote..."
    }
  ],
  "confidence": "high"
}
```

### `get_avatar_info`

Return metadata about the avatar.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

**Output:**
```json
{
  "id": "elinor-ostrom",
  "name": "Elinor Ostrom",
  "description": "Nobel laureate who studied commons governance",
  "expertise": ["commons", "governance", "collective action"],
  "corpus_size": 1250000,
  "document_count": 45
}
```

## Server Configuration

MCP servers are configured via the avatar's `config.json`:

```json
{
  "mcp": {
    "name": "avatar-elinor-ostrom",
    "version": "1.0.0",
    "tools": ["query_corpus", "generate_response", "get_avatar_info"]
  }
}
```

## Connection

Clients connect to avatar MCP servers using stdio transport:

```bash
npx @avatar-sdk/mcp-server --avatar elinor-ostrom
```

Or via the MCP configuration in Claude Desktop / other clients:

```json
{
  "mcpServers": {
    "elinor-ostrom": {
      "command": "npx",
      "args": ["@avatar-sdk/mcp-server", "--avatar", "elinor-ostrom"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_ANON_KEY": "..."
      }
    }
  }
}
```

## Response Grounding

All responses from `generate_response` must be grounded in corpus passages:

1. **Citation required** - Every claim must reference a source document
2. **No hallucination** - Avatar must not invent positions not in the corpus
3. **Acknowledge limits** - If corpus doesn't cover a topic, avatar says so
4. **Time-bound** - Avatar speaks from the perspective of its historical period

## See Also

- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP documentation
- [Avatar Schema](./avatar-schema.json) - JSON schema for avatar configuration
- [Creating Avatars](../../docs/creating-avatars.md) - Guide to creating new avatars
