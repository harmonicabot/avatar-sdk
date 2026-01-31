import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pdfParse from 'pdf-parse';
import type { SourceDocument, ExtractionResult, ExtractedPage } from './types.js';
import { pdfPath } from './config.js';
import * as log from './logger.js';

export async function extractPdf(
  avatarId: string,
  source: SourceDocument,
): Promise<ExtractionResult> {
  const filePath = pdfPath(avatarId, source.id);

  if (!existsSync(filePath)) {
    log.error(`PDF not found: ${filePath}`);
    log.info(`Download from: ${source.url}`);
    throw new Error(`PDF not found for source "${source.id}"`);
  }

  const buffer = await readFile(filePath);

  const pages: ExtractedPage[] = [];

  // pdf-parse pagerender callback to capture per-page text
  const result = await pdfParse(buffer, {
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent();
      const strings: string[] = textContent.items.map(
        (item: any) => item.str as string,
      );
      const text = strings.join(' ').trim();
      if (text.length > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          text,
        });
      }
      // Return text for pdf-parse's internal accumulation
      return text;
    },
  });

  // If pagerender didn't capture pages (some PDFs), fall back to full text split
  if (pages.length === 0 && result.text.trim().length > 0) {
    log.warn('Page-level extraction failed, using full text');
    pages.push({
      pageNumber: 1,
      text: result.text.trim(),
    });
  }

  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);

  return {
    source,
    pages,
    totalPages: result.numpages,
    totalChars,
  };
}
