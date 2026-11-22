-- Services deployed from hosting nodes (ADR 0027). Only apps/deploy writes, with the service role
-- key, so nobody can point a row at another user's provider service. Owners only read their rows.

create table public.deployments (
  id text primary key check (length(id) between 1 and 100),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  flow_id text not null check (length(flow_id) between 1 and 100),
  node_id text not null check (length(node_id) between 1 and 100),
  provider_service_id text not null unique,
  url text,
  spec jsonb not null,
  spec_hash text not null,
  status text not null
    check (status in ('creating', 'deploying', 'live', 'failed', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, flow_id, node_id)
);

create index deployments_owner on public.deployments (owner_id);

alter table public.deployments enable row level security;

-- `(select auth.uid())` is evaluated once per query instead of once per row.
create policy "owners read their deployments" on public.deployments for select
  using (owner_id = (select auth.uid()));

grant select on public.deployments to authenticated;

-- apps/deploy writes with the service role key; RLS does not apply to it.
grant select, insert, update, delete on public.deployments to service_role;
