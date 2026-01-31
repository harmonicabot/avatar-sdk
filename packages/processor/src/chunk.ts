import { encode } from 'gpt-tokenizer/model/gpt-4o';
import type { ExtractionResult, Chunk, VectorStoreConfig } from './types.js';

const SENTENCE_END = /(?<=[.!?])\s+/;

function splitSentences(text: string): string[] {
  return text.split(SENTENCE_END).filter((s) => s.trim().length > 0);
}

export function countTokens(text: string): number {
  return encode(text).length;
}

/**
 * Chunk extracted pages into token-aware chunks with overlap.
 *
 * Sliding window over sentences: accumulate until chunkSize tokens,
 * then step back by chunkOverlap tokens for the next window.
 */
export function chunkDocument(
  extraction: ExtractionResult,
  config: VectorStoreConfig,
): Chunk[] {
  const { chunkSize, chunkOverlap } = config;
  const chunks: Chunk[] = [];

  // Flat list of sentences with page attribution
  const sentences: { text: string; tokens: number; page: number }[] = [];

  for (const page of extraction.pages) {
    for (const sent of splitSentences(page.text)) {
      const trimmed = sent.trim();
      if (trimmed.length === 0) continue;
      sentences.push({
        text: trimmed,
        tokens: countTokens(trimmed),
        page: page.pageNumber,
      });
    }
  }

  if (sentences.length === 0) return chunks;

  let start = 0;

  while (start < sentences.length) {
    let tokenCount = 0;
    let end = start;

    // Accumulate sentences until we hit chunkSize
    while (end < sentences.length && tokenCount + sentences[end].tokens <= chunkSize) {
      tokenCount += sentences[end].tokens;
      end++;
    }

    // If a single sentence exceeds chunkSize, include it anyway
    if (end === start) {
      tokenCount = sentences[end].tokens;
      end++;
    }

    const windowSentences = sentences.slice(start, end);
    const content = windowSentences.map((s) => s.text).join(' ');

    chunks.push({
      content,
      tokenCount,
      sourceTitle: extraction.source.title,
      sourcePage: windowSentences[0].page,
      sourceYear: extraction.source.year,
      chunkIndex: chunks.length,
    });

    // Calculate next start: step back from end by chunkOverlap tokens
    let overlapTokens = 0;
    let nextStart = end;
    for (let j = end - 1; j > start; j--) {
      overlapTokens += sentences[j].tokens;
      if (overlapTokens >= chunkOverlap) {
        nextStart = j;
        break;
      }
    }

    // Ensure forward progress
    if (nextStart <= start) {
      nextStart = end;
    }

    start = nextStart;
  }

  return chunks;
}
