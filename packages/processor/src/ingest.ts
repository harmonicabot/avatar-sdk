import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SourceDocument, EmbeddedChunk } from './types.js';
import * as log from './logger.js';

const CHUNK_BATCH_SIZE = 100;

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Check if a document has already been processed.
 */
export async function isDocumentProcessed(
  avatarId: string,
  title: string,
): Promise<boolean> {
  const client = getClient();
  const { data } = await client
    .from('avatar_documents')
    .select('processed')
    .eq('avatar_id', avatarId)
    .eq('title', title)
    .single();

  return data?.processed === true;
}

/**
 * Register or update a document record in avatar_documents.
 * Returns the document UUID.
 */
export async function upsertDocument(
  avatarId: string,
  source: SourceDocument,
): Promise<string> {
  const client = getClient();

  // Check for existing document by avatar_id + title
  const { data: existing } = await client
    .from('avatar_documents')
    .select('id')
    .eq('avatar_id', avatarId)
    .eq('title', source.title)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data, error } = await client
    .from('avatar_documents')
    .insert({
      avatar_id: avatarId,
      title: source.title,
      authors: source.authors,
      year: source.year,
      document_type: source.type,
      url: source.url,
      doi: source.doi ?? null,
      verified: source.verified,
      processed: false,
      chunk_count: 0,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to insert document: ${error.message}`);
  return data.id;
}

/**
 * Delete existing chunks for a document (used with --force).
 */
export async function clearChunks(documentId: string): Promise<number> {
  const client = getClient();
  const { data, error } = await client
    .from('avatar_chunks')
    .delete()
    .eq('document_id', documentId)
    .select('id');

  if (error) throw new Error(`Failed to clear chunks: ${error.message}`);
  return data?.length ?? 0;
}

/**
 * Insert embedded chunks in batches of 100.
 */
export async function insertChunks(
  avatarId: string,
  documentId: string,
  chunks: EmbeddedChunk[],
): Promise<void> {
  const client = getClient();

  for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
    const batch = chunks.slice(i, i + CHUNK_BATCH_SIZE);

    const rows = batch.map((chunk) => ({
      avatar_id: avatarId,
      document_id: documentId,
      content: chunk.content,
      embedding: JSON.stringify(chunk.embedding),
      source_title: chunk.sourceTitle,
      source_page: chunk.sourcePage,
      source_year: chunk.sourceYear,
      chunk_index: chunk.chunkIndex,
      metadata: { tokenCount: chunk.tokenCount },
    }));

    const { error } = await client.from('avatar_chunks').insert(rows);

    if (error) throw new Error(`Failed to insert chunks: ${error.message}`);

    log.info(
      `Inserted batch ${Math.floor(i / CHUNK_BATCH_SIZE) + 1}/${Math.ceil(chunks.length / CHUNK_BATCH_SIZE)} (${batch.length} chunks)`,
    );
  }
}

/**
 * Mark a document as processed and update chunk count.
 */
export async function markDocumentProcessed(
  documentId: string,
  chunkCount: number,
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('avatar_documents')
    .update({ processed: true, chunk_count: chunkCount })
    .eq('id', documentId);

  if (error) throw new Error(`Failed to update document: ${error.message}`);
}
