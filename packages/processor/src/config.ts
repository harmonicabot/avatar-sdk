import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AvatarConfig, SourceDocument, SourcesManifest, VectorStoreConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

export function avatarDir(avatarId: string): string {
  return resolve(REPO_ROOT, 'avatars', avatarId);
}

export function corpusDir(avatarId: string): string {
  return resolve(avatarDir(avatarId), 'corpus', 'open-access');
}

export function pdfPath(avatarId: string, sourceId: string): string {
  return resolve(corpusDir(avatarId), `${sourceId}.pdf`);
}

export async function loadAvatarConfig(avatarId: string): Promise<AvatarConfig> {
  const configPath = resolve(avatarDir(avatarId), 'config.json');
  const raw = await readFile(configPath, 'utf-8');
  return JSON.parse(raw) as AvatarConfig;
}

export async function loadSources(avatarId: string): Promise<SourcesManifest> {
  const sourcesPath = resolve(avatarDir(avatarId), 'corpus', 'sources.json');
  const raw = await readFile(sourcesPath, 'utf-8');
  return JSON.parse(raw) as SourcesManifest;
}

export function getVectorStoreConfig(config: AvatarConfig): VectorStoreConfig {
  const vs = config.vectorStore ?? {};
  return {
    table: vs.table ?? 'avatar_chunks',
    embeddingModel: vs.embeddingModel ?? 'text-embedding-3-small',
    embeddingDimensions: vs.embeddingDimensions ?? 1536,
    chunkSize: vs.chunkSize ?? 512,
    chunkOverlap: vs.chunkOverlap ?? 50,
  };
}

export function filterSources(
  manifest: SourcesManifest,
  sourceId?: string,
): SourceDocument[] {
  let sources = manifest.sources.filter(
    (s) => s.priority === 'primary' && s.format === 'PDF',
  );

  if (sourceId) {
    sources = sources.filter((s) => s.id === sourceId);
    if (sources.length === 0) {
      throw new Error(
        `Source "${sourceId}" not found or not a primary PDF source`,
      );
    }
  }

  return sources;
}
