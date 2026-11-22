-- Durable, owner-only agent drafts (ADR 0026).
create table public.flow_drafts (
  id text primary key check (char_length(id) between 1 and 100),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  flow_id text not null,
  base_revision text not null,
  flow jsonb not null,
  updated_at timestamptz not null default now()
);

create index flow_drafts_owner_updated_at on public.flow_drafts (owner_id, updated_at desc);

alter table public.flow_drafts enable row level security;

create policy "owners manage drafts" on public.flow_drafts for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger before_draft_write before insert or update on public.flow_drafts
  for each row execute function public.touch_flow();

revoke all on public.flow_drafts from anon, authenticated;
grant select, insert, delete on public.flow_drafts to authenticated;
grant update (flow, base_revision, updated_at) on public.flow_drafts to authenticated;
