-- Minimal Supabase environment on plain Postgres with pgvector, just enough for the migrations.
-- Like the real project, new tables get no default grants for the API roles.

create role anon nologin;
create role authenticated nologin;
-- Supabase's service role skips Row Level Security.
create role service_role nologin bypassrls;

create schema extensions;
create schema auth;
create schema storage;

create extension vector with schema extensions;
grant usage on schema extensions to anon, authenticated;
grant usage on schema auth to anon, authenticated;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text
);

alter table storage.objects enable row level security;

create function storage.foldername(name text) returns text[]
language sql immutable as $$
  select string_to_array(name, '/')
$$;
