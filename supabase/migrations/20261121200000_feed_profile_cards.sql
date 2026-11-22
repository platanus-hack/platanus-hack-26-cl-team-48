-- Profile cards and the feed search function (ADR 0022 section 4).

create extension if not exists vector with schema extensions;

-- Profile cards ----------------------------------------------------------------------------------

create table public.profile_cards (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  card jsonb not null,
  schema_version integer not null check (schema_version > 0),
  offers_embedding extensions.vector(1024) not null,
  seeks_embedding extensions.vector(1024),
  content_hash text not null,
  embedding_model text not null,
  updated_at timestamptz not null default now()
);

create index profile_cards_offers_embedding_idx
  on public.profile_cards using hnsw (offers_embedding extensions.vector_cosine_ops);

create index profile_cards_seeks_embedding_idx
  on public.profile_cards using hnsw (seeks_embedding extensions.vector_cosine_ops);

-- Row level security -----------------------------------------------------------------------------

alter table public.profile_cards enable row level security;

create policy "Profile cards are public"
  on public.profile_cards for select
  to anon, authenticated using (true);

create policy "Owners insert profile cards"
  on public.profile_cards for insert
  to authenticated with check (profile_id = auth.uid());

create policy "Owners update profile cards"
  on public.profile_cards for update
  to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "Owners delete profile cards"
  on public.profile_cards for delete
  to authenticated using (profile_id = auth.uid());

-- Feed search ------------------------------------------------------------------------------------

create function public.match_feed(
  query extensions.vector(1024),
  k integer,
  exclude_profile uuid default null
)
returns table (kind text, id text, title text, payload jsonb, similarity double precision)
language sql stable security invoker
set search_path = ''
as $$
  select * from (
    select
      'profile'::text as kind,
      p.handle as id,
      coalesce(nullif(p.display_name, ''), p.handle) as title,
      pc.card as payload,
      1 - (pc.offers_embedding operator(extensions.<=>) query) as similarity
    from public.profile_cards as pc
    join public.profiles as p on p.id = pc.profile_id
    where pc.profile_id is distinct from exclude_profile
    union all
    select
      c.card ->> 'kind',
      c.id,
      c.card ->> 'name',
      c.card,
      1 - (c.embedding operator(extensions.<=>) query)
    from public.agent_component_cards as c
  ) as feed
  order by feed.similarity desc
  limit greatest(k, 0);
$$;

-- Grants -----------------------------------------------------------------------------------------
-- This project does not grant new tables to the API roles by default; row level security above
-- still decides which rows each role reaches.

grant select on public.profile_cards to anon, authenticated;
grant insert, update, delete on public.profile_cards to authenticated;
-- match_feed runs as the caller and reads component cards, so the API roles need select on them.
grant select on public.agent_component_cards to anon, authenticated;
grant execute on function public.match_feed(extensions.vector, integer, uuid) to anon, authenticated;
