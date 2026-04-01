#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// --- Config ---

interface AvatarRow {
  id: string;
  name: string;
  description: string;
  expertise: string[];
  corpus_description: string;
  system_prompt: {
    identity: string;
    tone: string;
    constraints: string[];
    citationStyle: string;
  };
  embedding_model: string;
  embedding_dimensions: number;
}

function getAvatarId(): string {
  const idx = process.argv.indexOf('--avatar');
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: avatar-mcp-server --avatar <id>');
    process.exit(1);
  }
  return process.argv[idx + 1];
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY) must be set');
    process.exit(1);
  }
  return createClient(url, key);
}

function getOpenAI(): OpenAI {
  return new OpenAI();
}

// --- Embedding ---

async function embed(openai: OpenAI, text: string, model: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model, input: text });
  return res.data[0].embedding;
}

// --- Main ---

async function main(): Promise<void> {
  const avatarId = getAvatarId();
  const supabase = getSupabase();
  const openai = getOpenAI();

  // Load avatar config from DB
  const { data: avatar, error: avatarError } = await supabase
    .from('avatars')
    .select('id, name, description, expertise, corpus_description, system_prompt, embedding_model, embedding_dimensions')
    .eq('id', avatarId)
    .single();

  if (avatarError || !avatar) {
    console.error(`Avatar "${avatarId}" not found: ${avatarError?.message}`);
    process.exit(1);
  }

  const av = avatar as AvatarRow;

  // Get counts
  const { count: docCount } = await supabase
    .from('avatar_documents')
    .select('id', { count: 'exact', head: true })
    .eq('avatar_id', avatarId);

  const { count: chunkCount } = await supabase
    .from('avatar_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('avatar_id', avatarId);

  // Create server
  const server = new Server(
    { name: `avatar-${avatarId}`, version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // --- List tools ---
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'query_corpus',
        description: `Search ${av.name}'s corpus for relevant passages using semantic similarity.`,
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'The search query to find relevant passages' },
            limit: { type: 'number', description: 'Max passages to return (1-20)', default: 5 },
            threshold: { type: 'number', description: 'Min similarity score (0-1)', default: 0.3 },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_avatar_info',
        description: `Get metadata about the ${av.name} avatar.`,
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
      {
        name: 'generate_response',
        description: `Generate a grounded response as a student of ${av.name}'s work. Retrieves relevant passages and builds a cited prompt.`,
        inputSchema: {
          type: 'object' as const,
          properties: {
            question: { type: 'string', description: 'The question or topic to respond to' },
            context: {
              type: 'array',
              items: {
                type: 'object',
                properties: { role: { type: 'string' }, content: { type: 'string' } },
              },
              description: 'Prior conversation messages',
              default: [],
            },
            passage_limit: { type: 'number', description: 'Number of passages to retrieve', default: 8 },
          },
          required: ['question'],
        },
      },
    ],
  }));

  // --- Call tool ---
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'query_corpus') {
      const query = args?.query as string;
      const limit = Math.min((args?.limit as number) ?? 5, 20);
      const threshold = (args?.threshold as number) ?? 0.7;

      const queryEmbedding = await embed(openai, query, av.embedding_model);

      const { data, error } = await supabase.rpc('search_avatar_chunks', {
        p_avatar_id: avatarId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_match_count: limit,
        p_match_threshold: threshold,
      });

      if (error) {
        return { content: [{ type: 'text', text: `Search error: ${error.message}` }], isError: true };
      }

      interface ChunkRow {
        content: string;
        source_title: string;
        source_page: number;
        source_year: number;
        similarity: number;
      }

      const passages = (data ?? []).map((row: ChunkRow) => ({
        content: row.content,
        source: row.source_title,
        page: row.source_page,
        year: row.source_year,
        score: Math.round(row.similarity * 1000) / 1000,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify({ passages, count: passages.length }, null, 2) }],
      };
    }

    if (name === 'get_avatar_info') {
      const info = {
        id: av.id,
        name: av.name,
        description: av.description,
        expertise: av.expertise,
        corpus_description: av.corpus_description,
        document_count: docCount ?? 0,
        chunk_count: chunkCount ?? 0,
        system_prompt: av.system_prompt,
      };
      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
    }

    if (name === 'generate_response') {
      const question = args?.question as string;
      const context = (args?.context as Array<{ role: string; content: string }>) ?? [];
      const passageLimit = (args?.passage_limit as number) ?? 8;

      const queryEmbedding = await embed(openai, question, av.embedding_model);

      const { data: passages } = await supabase.rpc('search_avatar_chunks', {
        p_avatar_id: avatarId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_match_count: passageLimit,
        p_match_threshold: 0.65,
      });

      interface PassageRow {
        content: string;
        source_title: string;
        source_year: number;
        similarity: number;
      }

      const retrieved = (passages ?? []).map((row: PassageRow) => ({
        content: row.content,
        source: row.source_title,
        year: row.source_year,
        score: Math.round(row.similarity * 1000) / 1000,
      }));

      const systemPrompt = [
        av.system_prompt.identity,
        '',
        `Tone: ${av.system_prompt.tone}`,
        '',
        'Constraints:',
        ...av.system_prompt.constraints.map((c) => `- ${c}`),
        '',
        `Citation style: ${av.system_prompt.citationStyle}`,
        '',
        '--- Retrieved passages from the corpus ---',
        '',
        ...retrieved.map((p: { source: string; year: number; score: number; content: string }, i: number) =>
          `[${i + 1}] "${p.source}" (${p.year}, relevance: ${p.score})\n${p.content}`,
        ),
        '',
        '--- End of retrieved passages ---',
        '',
        "Respond using ONLY information from the passages above. Cite sources by title. If the passages don't cover the topic, say so.",
      ].join('\n');

      const messages = [
        ...context.map((m) => `${m.role}: ${m.content}`),
        `user: ${question}`,
      ].join('\n');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            system_prompt: systemPrompt,
            messages,
            retrieved_passages: retrieved,
            passage_count: retrieved.length,
            note: 'This tool returns a grounded system prompt with retrieved passages. The calling LLM should use this to formulate its response.',
          }, null, 2),
        }],
      };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  });

  // Connect
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Avatar MCP Server running: ${av.name} (${chunkCount} chunks from ${docCount} documents)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
