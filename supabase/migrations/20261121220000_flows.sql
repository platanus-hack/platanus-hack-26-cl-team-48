-- Saved flows, private or public (ADR 0023). The interface parses `document` when it reads it.

create table public.flows (
  id text primary key check (length(id) between 1 and 100),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  document jsonb not null,
  updated_at timestamptz not null default now()
);

create index flows_owner_updated_at on public.flows (owner_id, updated_at desc);

alter table public.flows enable row level security;

-- `(select auth.uid())` is evaluated once per query instead of once per row.
create policy "owners and the public read flows" on public.flows for select
  using (owner_id = (select auth.uid()) or visibility = 'public');
create policy "owners create flows" on public.flows for insert
  with check (owner_id = (select auth.uid()));
create policy "owners edit flows" on public.flows for update
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete flows" on public.flows for delete
  using (owner_id = (select auth.uid()));

-- Every save rewrites the row; the server's clock orders "Mis flujos".
create function public.touch_flow() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger before_flow_write before insert or update on public.flows
  for each row execute function public.touch_flow();

grant select on public.flows to anon, authenticated;
grant insert, delete on public.flows to authenticated;
-- An upsert also sets the conflicting `id`, so it needs the grant too.
grant update (id, visibility, document) on public.flows to authenticated;
