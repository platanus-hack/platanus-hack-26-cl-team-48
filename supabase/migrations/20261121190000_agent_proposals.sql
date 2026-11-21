create table public.agent_proposals (
  id text primary key,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  flow_id text not null,
  draft_id text not null,
  base_revision text not null,
  version integer not null default 1,
  status text not null check (status in ('pending', 'partially_accepted', 'accepted', 'rejected', 'stale')),
  changes jsonb not null default '[]'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index agent_proposals_owner_idx on public.agent_proposals (owner_id);
create index agent_proposals_flow_idx on public.agent_proposals (owner_id, flow_id);

alter table public.agent_proposals enable row level security;

create policy "Owners select proposals"
  on public.agent_proposals for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners insert proposals"
  on public.agent_proposals for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners update proposals"
  on public.agent_proposals for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
