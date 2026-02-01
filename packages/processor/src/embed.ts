import OpenAI from 'openai';
import type { Chunk, EmbeddedChunk, VectorStoreConfig } from './types.js';
import * as log from './logger.js';

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatch(
  texts: string[],
  model: string,
  dimensions: number,
): Promise<number[][]> {
  const openai = getClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model,
        dimensions,
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      const isRateLimit = apiErr?.status === 429;
      const isServer = (apiErr?.status ?? 0) >= 500;

      if ((isRateLimit || isServer) && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        log.warn(`API error (${apiErr.status}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unreachable');
}

export async function embedChunks(
  chunks: Chunk[],
  config: VectorStoreConfig,
): Promise<EmbeddedChunk[]> {
  const { embeddingModel, embeddingDimensions } = config;
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    log.info(
      `Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)`,
    );

    const embeddings = await embedBatch(texts, embeddingModel, embeddingDimensions);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        embedding: embeddings[j],
      });
    }
  }

  return results;
}
