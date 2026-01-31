import { loadAvatarConfig, loadSources, filterSources, getVectorStoreConfig } from './config.js';
import { extractPdf } from './extract.js';
import { chunkDocument, countTokens } from './chunk.js';
import { embedChunks } from './embed.js';
import {
  isDocumentProcessed,
  upsertDocument,
  clearChunks,
  insertChunks,
  markDocumentProcessed,
} from './ingest.js';
import * as log from './logger.js';
import type { PipelineOptions } from './types.js';

function printUsage(): void {
  console.log(`
Usage: npx tsx packages/processor/src/index.ts [options]

Options:
  --avatar <id>     Avatar to process (required)
  --source <id>     Process a specific source only
  --dry-run         Extract and chunk only, no API calls
  --force           Re-process even if already done
  --help            Show this help message

Examples:
  npx tsx packages/processor/src/index.ts --avatar elinor-ostrom
  npx tsx packages/processor/src/index.ts --avatar elinor-ostrom --dry-run
  npx tsx packages/processor/src/index.ts --avatar elinor-ostrom --source nobel-lecture-2009
  npx tsx packages/processor/src/index.ts --avatar elinor-ostrom --source sustaining-the-commons --force
`);
}

function parseArgs(argv: string[]): PipelineOptions | null {
  const args = argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return null;
  }

  let avatarId: string | undefined;
  let sourceId: string | undefined;
  let dryRun = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--avatar':
        avatarId = args[++i];
        break;
      case '--source':
        sourceId = args[++i];
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--force':
        force = true;
        break;
      default:
        log.error(`Unknown argument: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  if (!avatarId) {
    log.error('--avatar is required');
    printUsage();
    process.exit(1);
  }

  return { avatarId, sourceId, dryRun, force };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (!opts) return;

  const { avatarId, sourceId, dryRun, force } = opts;

  log.divider();
  log.info(`Avatar SDK — Corpus Processor`);
  log.divider();

  // Load configuration
  log.step('Config', `Loading avatar "${avatarId}"`);
  const config = await loadAvatarConfig(avatarId);
  const manifest = await loadSources(avatarId);
  const vsConfig = getVectorStoreConfig(config);

  log.stat('Embedding model', vsConfig.embeddingModel);
  log.stat('Chunk size', `${vsConfig.chunkSize} tokens`);
  log.stat('Chunk overlap', `${vsConfig.chunkOverlap} tokens`);

  if (dryRun) {
    log.warn('Dry run — no API calls will be made');
  }

  // Filter sources
  const sources = filterSources(manifest, sourceId);
  log.stat('Sources to process', sources.length);

  let totalChunks = 0;
  let totalTokens = 0;
  let processed = 0;
  let skipped = 0;

  for (const source of sources) {
    log.step('Source', `"${source.title}" (${source.id})`);

    // Check if already processed (unless --force or --dry-run)
    if (!dryRun && !force) {
      const alreadyDone = await isDocumentProcessed(avatarId, source.title);
      if (alreadyDone) {
        log.info('Already processed, skipping (use --force to re-process)');
        skipped++;
        continue;
      }
    }

    // Extract
    log.info('Extracting text from PDF...');
    const extraction = await extractPdf(avatarId, source);
    log.stat('Pages extracted', extraction.pages.length);
    log.stat('Characters', extraction.totalChars.toLocaleString());

    // Chunk
    log.info('Chunking text...');
    const chunks = chunkDocument(extraction, vsConfig);
    const docTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    log.stat('Chunks created', chunks.length);
    log.stat('Total tokens', docTokens.toLocaleString());

    totalChunks += chunks.length;
    totalTokens += docTokens;

    if (dryRun) {
      log.success(`Dry run complete for "${source.id}"`);
      processed++;
      continue;
    }

    // Register document
    log.info('Registering document in Supabase...');
    const documentId = await upsertDocument(avatarId, source);

    // Clear existing chunks if --force
    if (force) {
      const cleared = await clearChunks(documentId);
      if (cleared > 0) {
        log.info(`Cleared ${cleared} existing chunks`);
      }
    }

    // Embed
    log.info('Generating embeddings...');
    const embeddedChunks = await embedChunks(chunks, vsConfig);

    // Ingest
    log.info('Inserting into Supabase...');
    await insertChunks(avatarId, documentId, embeddedChunks);
    await markDocumentProcessed(documentId, chunks.length);

    log.success(`Done: "${source.id}" — ${chunks.length} chunks`);
    processed++;
  }

  // Summary
  log.divider();
  log.success('Pipeline complete');
  log.stat('Processed', processed);
  log.stat('Skipped', skipped);
  log.stat('Total chunks', totalChunks);
  log.stat('Total tokens', totalTokens.toLocaleString());
  log.divider();
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
