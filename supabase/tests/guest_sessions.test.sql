-- Tests for guest (anonymous) sessions (ADR 0034 §5). Run by supabase/tests/run.sh.
-- Each block checks one behavior and raises an exception (ASSERT) when it does not hold.

-- Fixtures ---------------------------------------------------------------------------------------

-- A 1024-dim vector with weight 1 on the first axis.
create function public.guest_test_vec() returns extensions.vector
language sql immutable as $$
  select (array[1::real] || array_fill(0::real, array[1023]))::extensions.vector
$$;

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', 'member@example.com', '{"user_name": "member"}', false),
  ('00000000-0000-0000-0000-0000000000a2', null, '{}', true);

-- Profiles ---------------------------------------------------------------------------------------

-- An anonymous user gets no public profile.
do $$ begin
  assert not exists (select 1 from public.profiles
    where id = '00000000-0000-0000-0000-0000000000a2'), 'anonymous user got a profile';
end $$;

-- A normal user still gets a profile.
do $$ begin
  assert exists (select 1 from public.profiles
    where id = '00000000-0000-0000-0000-0000000000a1'), 'normal user got no profile';
end $$;

-- A user inserted without is_anonymous is a normal user and gets a profile.
do $$ begin
  insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000a3', 'plain@example.com', '{"user_name": "plain"}');
  assert exists (select 1 from public.profiles
    where id = '00000000-0000-0000-0000-0000000000a3'), 'default user got no profile';
end $$;

-- RLS: guests never write -----------------------------------------------------------------------

-- A second anonymous user is given a profile by hand, so the writes below can only fail because of
-- row level security and not because the owner row is missing.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous)
values ('00000000-0000-0000-0000-0000000000a4', null, '{}', true);
insert into public.profiles (id, handle, display_name)
values ('00000000-0000-0000-0000-0000000000a4', 'guest-test', '')
on conflict do nothing;

-- An anonymous user cannot insert their own profile card.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a4", "role": "authenticated", "is_anonymous": true}', true);
do $$ begin
  begin
    insert into public.profile_cards
      (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
    values ('00000000-0000-0000-0000-0000000000a4', '{}', 1, public.guest_test_vec(), 'h', 'm');
    assert false, 'anonymous profile card insert was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- An anonymous user cannot insert their own flow.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a4", "role": "authenticated", "is_anonymous": true}', true);
do $$ begin
  begin
    insert into public.flows (id, owner_id, document)
    values ('guest-flow', '00000000-0000-0000-0000-0000000000a4', '{}');
    assert false, 'anonymous flow insert was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- An anonymous user cannot insert their own publication.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a4", "role": "authenticated", "is_anonymous": true}', true);
do $$ begin
  begin
    insert into public.publications (owner_id, slug, kind, title)
    values ('00000000-0000-0000-0000-0000000000a4', 'guest-pub', 'flow', 'Guest publication');
    assert false, 'anonymous publication insert was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- RLS: normal users still write ------------------------------------------------------------------

-- A normal user with is_anonymous false inserts their own flow.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "is_anonymous": false}', true);
do $$ begin
  insert into public.flows (id, owner_id, document)
  values ('member-flow', '00000000-0000-0000-0000-0000000000a1', '{}');
  assert exists (select 1 from public.flows where id = 'member-flow'), 'own flow insert not visible';
end $$;
rollback;

-- A normal user whose token has no is_anonymous claim inserts their own flow.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
do $$ begin
  insert into public.flows (id, owner_id, document)
  values ('member-flow-2', '00000000-0000-0000-0000-0000000000a1', '{}');
  assert exists (select 1 from public.flows where id = 'member-flow-2'), 'own flow insert not visible';
end $$;
rollback;

-- A normal user with is_anonymous false inserts their own profile card.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "is_anonymous": false}', true);
do $$ begin
  insert into public.profile_cards
    (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model)
  values ('00000000-0000-0000-0000-0000000000a1', '{}', 1, public.guest_test_vec(), 'h', 'm');
  assert exists (select 1 from public.profile_cards
    where profile_id = '00000000-0000-0000-0000-0000000000a1'), 'own card insert not visible';
end $$;
rollback;

-- A normal user with is_anonymous false inserts their own publication.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "is_anonymous": false}', true);
do $$ begin
  insert into public.publications (owner_id, slug, kind, title)
  values ('00000000-0000-0000-0000-0000000000a1', 'member-pub', 'flow', 'Member publication');
  assert exists (select 1 from public.publications where slug = 'member-pub'),
    'own publication insert not visible';
end $$;
rollback;

drop function public.guest_test_vec();
