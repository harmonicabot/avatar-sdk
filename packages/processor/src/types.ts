// Avatar configuration (from config.json)
export interface AvatarConfig {
  id: string;
  name: string;
  description: string;
  birthYear?: number;
  deathYear?: number;
  expertise: string[];
  corpus: {
    description: string;
    dateRange?: { start: string; end: string };
    sources: {
      title: string;
      type: string;
      year?: number;
      verified?: boolean;
      notes?: string;
    }[];
  };
  systemPrompt: {
    identity: string;
    tone: string;
    constraints: string[];
    citationStyle: string;
  };
  vectorStore?: {
    table?: string;
    embeddingModel?: string;
    embeddingDimensions?: number;
    chunkSize?: number;
    chunkOverlap?: number;
  };
}

// Source document (from sources.json)
export interface SourceDocument {
  id: string;
  title: string;
  authors: string[];
  year: number;
  type: string;
  description: string;
  url: string;
  archive_url?: string;
  license: string;
  format: string;
  verified: boolean;
  priority: 'primary' | 'secondary';
  topics: string[];
  doi?: string;
  hdl?: string;
  journal?: string;
  volume?: string;
  pages?: string;
}

export interface SourcesManifest {
  avatar: string;
  corpus_description: string;
  last_updated: string;
  sources: SourceDocument[];
}

// Extracted page from a PDF
export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

// Result of PDF extraction
export interface ExtractionResult {
  source: SourceDocument;
  pages: ExtractedPage[];
  totalPages: number;
  totalChars: number;
}

// A text chunk ready for embedding
export interface Chunk {
  content: string;
  tokenCount: number;
  sourceTitle: string;
  sourcePage: number;
  sourceYear: number;
  chunkIndex: number;
}

// A chunk with its embedding vector
export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

// Pipeline options from CLI args
export interface PipelineOptions {
  avatarId: string;
  sourceId?: string;
  dryRun: boolean;
  force: boolean;
}

// Vector store config with defaults applied
export interface VectorStoreConfig {
  table: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chunkSize: number;
  chunkOverlap: number;
}
