-- Agent temporal memory (ADR 0020): entities, time-bounded edges and insert-only episodes.
-- Every row belongs to one actor (profiles.id) and RLS limits access to that owner.

create table public.agent_entities (
  id text not null,
  actor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, id)
);

create table public.agent_edges (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  src text not null,
  dst text not null,
  relation text not null,
  valid_from timestamptz not null,
  valid_to timestamptz,
  constraint agent_edges_valid_range check (valid_to is null or valid_to >= valid_from)
);

create table public.agent_episodes (
  id text primary key,
  actor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  at timestamptz not null,
  kind text not null check (kind in ('mcp_call', 'message', 'proposal_decision')),
  entity_ids text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb
);

create index agent_edges_src_idx on public.agent_edges (actor_id, src);
create index agent_edges_dst_idx on public.agent_edges (actor_id, dst);
create index agent_episodes_entities_idx on public.agent_episodes using gin (entity_ids);

alter table public.agent_entities enable row level security;
alter table public.agent_edges enable row level security;
alter table public.agent_episodes enable row level security;

create policy agent_entities_owner on public.agent_entities
  for all to authenticated
  using ((select auth.uid()) = actor_id)
  with check ((select auth.uid()) = actor_id);

create policy agent_edges_owner on public.agent_edges
  for all to authenticated
  using ((select auth.uid()) = actor_id)
  with check ((select auth.uid()) = actor_id);

-- Episodes are history: the owner can read and insert, never update or delete.
create policy agent_episodes_select_owner on public.agent_episodes
  for select to authenticated
  using ((select auth.uid()) = actor_id);

create policy agent_episodes_insert_owner on public.agent_episodes
  for insert to authenticated
  with check ((select auth.uid()) = actor_id);
