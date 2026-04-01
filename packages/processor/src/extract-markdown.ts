import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SourceDocument, ExtractionResult, ExtractedPage } from './types.js';
import * as log from './logger.js';

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n*/;

/**
 * Extract text from a markdown file, stripping YAML frontmatter.
 * Returns the content as a single "page" (markdown files don't have pages).
 */
export async function extractMarkdown(
  source: SourceDocument,
  corpusRoot: string,
): Promise<ExtractionResult> {
  if (!source.path) {
    throw new Error(`Source "${source.id}" has no path field`);
  }

  const filePath = resolve(corpusRoot, source.path);

  if (!existsSync(filePath)) {
    log.error(`Markdown file not found: ${filePath}`);
    throw new Error(`Markdown file not found for source "${source.id}"`);
  }

  const raw = await readFile(filePath, 'utf-8');

  // Strip YAML frontmatter
  const text = raw.replace(FRONTMATTER_RE, '').trim();

  const pages: ExtractedPage[] = [];
  if (text.length > 0) {
    pages.push({
      pageNumber: 1,
      text,
    });
  }

  return {
    source,
    pages,
    totalPages: 1,
    totalChars: text.length,
  };
}
