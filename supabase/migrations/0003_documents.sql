-- HelixOS AI — knowledge-base document metadata
--
-- The `documents` table (0001) holds RAG ingest metadata. The Knowledge upload
-- UI records a per-document `collection` and human-readable `size`; add those
-- columns. Vectors still live in Chroma/pgvector (later) — this is metadata.

alter table public.documents add column if not exists collection text;
alter table public.documents add column if not exists size text;
