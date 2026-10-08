CREATE TABLE organizations (id text PRIMARY KEY);
CREATE TABLE post_collections (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TABLE projects (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TYPE post_status AS ENUM ('draft', 'published');
CREATE TABLE posts (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collection_id text NOT NULL REFERENCES post_collections(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  content text NOT NULL,
  html_url text,
  markdown text,
  recommendations text,
  content_type text NOT NULL,
  content_subtype text,
  created_at timestamp NOT NULL DEFAULT now(),
  source_metadata jsonb,
  github_publish jsonb,
  status post_status NOT NULL DEFAULT 'draft',
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE geo_scans (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  plan jsonb,
  plan_summary jsonb,
  error_code text,
  error_message text,
  failed_stage text,
  retryable boolean,
  started_at timestamp NOT NULL DEFAULT now(),
  finished_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  run_id text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  reasoning_tokens integer,
  total_usd real,
  checks_total integer,
  checks_failed integer,
  mentions integer,
  duration_ms integer,
  usage_by_role jsonb
);
