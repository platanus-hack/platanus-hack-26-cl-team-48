create extension if not exists vector with schema extensions;

create table public.agent_component_cards (
  id text primary key,
  card jsonb not null,
  embedding extensions.vector(1024) not null,
  owner_id uuid not null default auth.uid()
);

create index agent_component_cards_embedding_idx
  on public.agent_component_cards using hnsw (embedding extensions.vector_cosine_ops);

alter table public.agent_component_cards enable row level security;

create policy "Component cards are public"
  on public.agent_component_cards for select
  to anon, authenticated using (true);

create policy "Owners insert component cards"
  on public.agent_component_cards for insert
  to authenticated with check (owner_id = auth.uid());

create policy "Owners update component cards"
  on public.agent_component_cards for update
  to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owners delete component cards"
  on public.agent_component_cards for delete
  to authenticated using (owner_id = auth.uid());

create function public.match_agent_components(query extensions.vector(1024), k integer)
returns table (id text, card jsonb, similarity double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select c.id, c.card, 1 - (c.embedding <=> query) as similarity
  from public.agent_component_cards as c
  order by c.embedding <=> query
  limit greatest(k, 0);
$$;
