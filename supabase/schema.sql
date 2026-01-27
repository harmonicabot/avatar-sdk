-- Avatar SDK Database Schema for Supabase
-- Enable pgvector extension for similarity search

create extension if not exists vector;

-- Avatars table: stores avatar metadata and configuration
create table avatars (
  id text primary key,
  name text not null,
  description text,
  expertise text[] default '{}',

  -- Historical figure metadata
  birth_year int,
  death_year int,

  -- Corpus metadata
  corpus_description text,
  corpus_date_start date,
  corpus_date_end date,

  -- System prompt configuration (stored as JSON)
  system_prompt jsonb not null,

  -- Vector store configuration
  embedding_model text default 'text-embedding-3-small',
  embedding_dimensions int default 1536,
  chunk_size int default 512,
  chunk_overlap int default 50,

  -- Status
  is_active boolean default true,
  is_official boolean default false,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Avatar documents: source material metadata (for transparency)
create table avatar_documents (
  id uuid primary key default gen_random_uuid(),
  avatar_id text references avatars(id) on delete cascade,

  -- Document metadata
  title text not null,
  authors text[] default '{}',
  year int,
  document_type text check (document_type in ('book', 'paper', 'speech', 'interview', 'article', 'letter', 'textbook', 'guide')),

  -- Source URLs
  url text,
  archive_url text,
  doi text,

  -- Verification
  verified boolean default false,
  verification_notes text,

  -- Processing status
  processed boolean default false,
  chunk_count int default 0,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Avatar chunks: text chunks with embeddings for similarity search
create table avatar_chunks (
  id uuid primary key default gen_random_uuid(),
  avatar_id text references avatars(id) on delete cascade,
  document_id uuid references avatar_documents(id) on delete cascade,

  -- Chunk content
  content text not null,

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536),

  -- Source metadata for citations
  source_title text,
  source_page int,
  source_chapter text,
  source_year int,

  -- Additional metadata
  metadata jsonb default '{}',

  -- Chunk position
  chunk_index int,

  -- Timestamps
  created_at timestamptz default now()
);

-- Create index for fast similarity search
create index on avatar_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create index for filtering by avatar
create index on avatar_chunks (avatar_id);

-- Function: Search for similar chunks
create or replace function search_avatar_chunks(
  p_avatar_id text,
  p_query_embedding vector(1536),
  p_match_count int default 5,
  p_match_threshold float default 0.7
)
returns table (
  id uuid,
  content text,
  source_title text,
  source_page int,
  source_year int,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    avatar_chunks.id,
    avatar_chunks.content,
    avatar_chunks.source_title,
    avatar_chunks.source_page,
    avatar_chunks.source_year,
    1 - (avatar_chunks.embedding <=> p_query_embedding) as similarity
  from avatar_chunks
  where avatar_chunks.avatar_id = p_avatar_id
    and 1 - (avatar_chunks.embedding <=> p_query_embedding) > p_match_threshold
  order by avatar_chunks.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
alter table avatars enable row level security;
alter table avatar_documents enable row level security;
alter table avatar_chunks enable row level security;

-- Public read access for official avatars
create policy "Public can read official avatars"
  on avatars for select
  using (is_official = true and is_active = true);

create policy "Public can read official avatar documents"
  on avatar_documents for select
  using (
    exists (
      select 1 from avatars
      where avatars.id = avatar_documents.avatar_id
        and avatars.is_official = true
        and avatars.is_active = true
    )
  );

create policy "Public can read official avatar chunks"
  on avatar_chunks for select
  using (
    exists (
      select 1 from avatars
      where avatars.id = avatar_chunks.avatar_id
        and avatars.is_official = true
        and avatars.is_active = true
    )
  );

-- Service role has full access (for processing pipeline)
-- Note: Service role bypasses RLS by default

-- Trigger to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger avatars_updated_at
  before update on avatars
  for each row execute function update_updated_at();

create trigger avatar_documents_updated_at
  before update on avatar_documents
  for each row execute function update_updated_at();
