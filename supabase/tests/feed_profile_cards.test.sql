-- Tests for public.profile_cards and public.match_feed (ADR 0022). Run by supabase/tests/run.sh.
-- Each block checks one behavior and raises an exception (ASSERT) when it does not hold.

-- Fixtures ---------------------------------------------------------------------------------------

-- A 1024-dim vector with weight a on axis i and weight b on axis j (1-based, i <> j).
create function public.test_vec(i int, a float8, j int default 1, b float8 default 0)
returns extensions.vector language sql immutable as $$
  select ('[' || string_agg(
    (case when n = i then a when n = j then b else 0 end)::text, ',' order by n
  ) || ']')::extensions.vector
  from generate_series(1, 1024) as n
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com', '{"user_name": "alice", "full_name": "Alice A"}'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com', '{"user_name": "bobby", "full_name": "Bob B"}'),
  ('00000000-0000-0000-0000-000000000003', 'carol@example.com', '{"user_name": "carol"}'),
  ('00000000-0000-0000-0000-000000000004', 'dave@example.com', '{"user_name": "dave"}');

-- Carol has an empty display name.
update public.profiles set display_name = '' where handle = 'carol';

-- Against a query on axis 1, similarities are: alice 1.0, c-tidy 0.8, bobby 0.6, c-pipe 0.28, carol 0.
insert into public.profile_cards
  (profile_id, card, schema_version, offers_embedding, seeks_embedding, content_hash, embedding_model)
values
  ('00000000-0000-0000-0000-000000000001', '{"who": "alice"}', 1,
    public.test_vec(1, 1), public.test_vec(5, 1), 'hash-alice', 'model-x'),
  ('00000000-0000-0000-0000-000000000002', '{"who": "bob"}', 1,
    public.test_vec(1, 0.6, 2, 0.8), null, 'hash-bob', 'model-x'),
  ('00000000-0000-0000-0000-000000000003', '{"who": "carol"}', 1,
    public.test_vec(3, 1), null, 'hash-carol', 'model-x');

insert into public.agent_component_cards (id, card, embedding, owner_id) values
  ('c-tidy', '{"kind": "node", "name": "Tidy"}', public.test_vec(1, 0.8, 2, 0.6),
    '00000000-0000-0000-0000-000000000002'),
  ('c-pipe', '{"kind": "flow", "name": "Pipe"}', public.test_vec(1, 0.28, 4, 0.96),
    '00000000-0000-0000-0000-000000000002');

-- Schema -----------------------------------------------------------------------------------------

-- profile_cards has an HNSW cosine index on offers_embedding.
do $$ begin
  assert exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'profile_cards'
      and indexdef ilike '%using hnsw (offers_embedding%vector_cosine_ops%'
  ), 'missing HNSW cosine index on offers_embedding';
end $$;

-- profile_cards has an HNSW cosine index on seeks_embedding.
do $$ begin
  assert exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'profile_cards'
      and indexdef ilike '%using hnsw (seeks_embedding%vector_cosine_ops%'
  ), 'missing HNSW cosine index on seeks_embedding';
end $$;

-- A profile may seek nothing: seeks_embedding accepts null.
do $$ begin
  assert (select seeks_embedding is null from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-000000000002'), 'seeks_embedding should be null';
end $$;

-- offers_embedding is required.
do $$ begin
  begin
    insert into public.profile_cards
      (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
    values ('00000000-0000-0000-0000-000000000004', '{}', 1, null, 'h', 'm');
    assert false, 'null offers_embedding was accepted';
  exception when not_null_violation then null;
  end;
end $$;

-- schema_version must be greater than zero.
do $$ begin
  begin
    insert into public.profile_cards
      (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
    values ('00000000-0000-0000-0000-000000000004', '{}', 0, public.test_vec(1, 1), 'h', 'm');
    assert false, 'schema_version 0 was accepted';
  exception when check_violation then null;
  end;
end $$;

-- updated_at defaults to now().
do $$ begin
  assert (select updated_at is not null and updated_at > now() - interval '1 hour'
    from public.profile_cards where profile_id = '00000000-0000-0000-0000-000000000001'),
    'updated_at default missing';
end $$;

-- Deleting a profile cascades to its card.
do $$ begin
  insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000ee', 'eve@example.com', '{"user_name": "eve"}');
  insert into public.profile_cards
    (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
  values ('00000000-0000-0000-0000-0000000000ee', '{}', 1, public.test_vec(1, 1), 'h', 'm');
  delete from auth.users where id = '00000000-0000-0000-0000-0000000000ee';
  assert not exists (select 1 from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-0000000000ee'), 'card survived profile deletion';
end $$;

-- RLS: reads -------------------------------------------------------------------------------------

-- RLS is enabled on profile_cards.
do $$ begin
  assert (select relrowsecurity from pg_class where oid = 'public.profile_cards'::regclass),
    'RLS not enabled';
end $$;

-- anon reads every profile card.
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.profile_cards) = 3, 'anon should see all 3 cards';
end $$;
rollback;

-- authenticated reads every profile card, including other users' cards.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
do $$ begin
  assert (select count(*) from public.profile_cards) = 3, 'authenticated should see all 3 cards';
end $$;
rollback;

-- RLS: writes ------------------------------------------------------------------------------------

-- An authenticated user inserts their own card.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
do $$ begin
  insert into public.profile_cards
    (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
  values ('00000000-0000-0000-0000-000000000004', '{"who": "dave"}', 1, public.test_vec(1, 1), 'h', 'm');
  assert exists (select 1 from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-000000000004'), 'own insert not visible';
end $$;
rollback;

-- An authenticated user cannot insert a card for another profile.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  begin
    insert into public.profile_cards
      (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
    values ('00000000-0000-0000-0000-000000000004', '{}', 1, public.test_vec(1, 1), 'h', 'm');
    assert false, 'insert for another profile was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- anon cannot insert a card.
begin;
set local role anon;
do $$ begin
  begin
    insert into public.profile_cards
      (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
    values ('00000000-0000-0000-0000-000000000004', '{}', 1, public.test_vec(1, 1), 'h', 'm');
    assert false, 'anon insert was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- An authenticated user updates their own card.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare n integer;
begin
  update public.profile_cards set content_hash = 'new-hash'
    where profile_id = '00000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'own update should affect 1 row';
  assert (select content_hash from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-000000000001') = 'new-hash', 'own update not applied';
end $$;
rollback;

-- Updating another user's card affects 0 rows.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare n integer;
begin
  update public.profile_cards set content_hash = 'hacked'
    where profile_id = '00000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'update of another card should affect 0 rows';
  assert (select content_hash from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-000000000002') = 'hash-bob', 'foreign card changed';
end $$;
rollback;

-- An authenticated user deletes their own card.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare n integer;
begin
  delete from public.profile_cards where profile_id = '00000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'own delete should affect 1 row';
end $$;
rollback;

-- Deleting another user's card affects 0 rows.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare n integer;
begin
  delete from public.profile_cards where profile_id = '00000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'delete of another card should affect 0 rows';
  assert exists (select 1 from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-000000000002'), 'foreign card deleted';
end $$;
rollback;

-- anon update and delete affect no rows.
begin;
set local role anon;
do $$
declare n integer;
begin
  begin
    update public.profile_cards set content_hash = 'x';
    get diagnostics n = row_count;
    assert n = 0, 'anon update should affect 0 rows';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.profile_cards;
    get diagnostics n = row_count;
    assert n = 0, 'anon delete should affect 0 rows';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- match_feed: permissions ------------------------------------------------------------------------

-- match_feed is executable by anon and authenticated and runs as the caller.
do $$ begin
  assert has_function_privilege('anon', 'public.match_feed(extensions.vector, integer, uuid)', 'execute'),
    'anon cannot execute match_feed';
  assert has_function_privilege('authenticated', 'public.match_feed(extensions.vector, integer, uuid)', 'execute'),
    'authenticated cannot execute match_feed';
  assert not (select prosecdef from pg_proc
    where oid = 'public.match_feed(extensions.vector, integer, uuid)'::regprocedure),
    'match_feed must be security invoker';
end $$;

-- match_feed: results ----------------------------------------------------------------------------

-- Results mix profiles and component cards ordered by similarity descending.
begin;
set local role anon;
do $$
declare ids text[]; sims float8[];
begin
  select array_agg(id), array_agg(similarity) into ids, sims
    from public.match_feed(public.test_vec(1, 1), 10);
  assert ids = array['alice', 'c-tidy', 'bobby', 'c-pipe', 'carol'], 'unexpected order: ' || ids::text;
  assert abs(sims[1] - 1.0) < 1e-6 and abs(sims[2] - 0.8) < 1e-6 and abs(sims[3] - 0.6) < 1e-6
    and abs(sims[4] - 0.28) < 1e-6 and abs(sims[5]) < 1e-6, 'unexpected similarities: ' || sims::text;
end $$;
rollback;

-- Profile rows map to kind, handle, display name, card and the offers similarity.
begin;
set local role anon;
do $$
declare r record;
begin
  select * into r from public.match_feed(public.test_vec(1, 1), 10) where id = 'bobby';
  assert r.kind = 'profile', 'profile kind should be profile';
  assert r.title = 'Bob B', 'profile title should be the display name';
  assert r.payload = '{"who": "bob"}'::jsonb, 'profile payload should be the card';
  assert abs(r.similarity - 0.6) < 1e-6, 'profile similarity should use offers_embedding';
end $$;
rollback;

-- A profile with an empty display name uses its handle as title.
begin;
set local role anon;
do $$ begin
  assert (select title from public.match_feed(public.test_vec(1, 1), 10) where id = 'carol') = 'carol',
    'empty display name should fall back to the handle';
end $$;
rollback;

-- Profile similarity ignores the seeks embedding.
begin;
set local role anon;
do $$ begin
  -- Alice seeks axis 5; a query on axis 5 must not match her offers (axis 1).
  assert abs((select similarity from public.match_feed(public.test_vec(5, 1), 10) where id = 'alice')) < 1e-6,
    'profile similarity must be computed against offers_embedding only';
end $$;
rollback;

-- Component rows map kind and title from the card, and id from the row id.
begin;
set local role anon;
do $$
declare r record;
begin
  select * into r from public.match_feed(public.test_vec(1, 1), 10) where id = 'c-tidy';
  assert r.kind = 'node', 'component kind should come from card->>kind';
  assert r.title = 'Tidy', 'component title should come from card->>name';
  assert r.payload = '{"kind": "node", "name": "Tidy"}'::jsonb, 'component payload should be the card';
  assert abs(r.similarity - 0.8) < 1e-6, 'component similarity should use embedding';
  select * into r from public.match_feed(public.test_vec(1, 1), 10) where id = 'c-pipe';
  assert r.kind = 'flow' and r.title = 'Pipe', 'second component mapping wrong';
end $$;
rollback;

-- The excluded profile is never returned and other rows are unaffected.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  assert not exists (select 1 from public.match_feed(
    public.test_vec(1, 1), 10, '00000000-0000-0000-0000-000000000001') where id = 'alice'),
    'excluded profile was returned';
  assert (select count(*) from public.match_feed(
    public.test_vec(1, 1), 10, '00000000-0000-0000-0000-000000000001')) = 4,
    'exclusion should only remove the excluded profile';
end $$;
rollback;

-- Without exclude_profile every row is returned.
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.match_feed(public.test_vec(1, 1), 10)) = 5, 'expected 5 rows';
end $$;
rollback;

-- Results are limited to k rows, keeping the most similar ones.
begin;
set local role anon;
do $$ begin
  assert (select array_agg(id) from public.match_feed(public.test_vec(1, 1), 2))
    = array['alice', 'c-tidy'], 'k = 2 should return the two best rows';
end $$;
rollback;

-- k = 0 returns nothing.
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.match_feed(public.test_vec(1, 1), 0)) = 0, 'k = 0 returned rows';
end $$;
rollback;

-- A negative k returns nothing.
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.match_feed(public.test_vec(1, 1), -3)) = 0, 'negative k returned rows';
end $$;
rollback;

-- An authenticated caller gets every row too.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
do $$ begin
  assert (select count(*) from public.match_feed(public.test_vec(1, 1), 10)) = 5,
    'authenticated should get all rows';
end $$;
rollback;

drop function public.test_vec(int, float8, int, float8);
