-- Tests for public.deployments (ADR 0027 §4). Run by supabase/tests/run.sh.
-- Each block checks one behavior and raises an exception (ASSERT) when it does not hold.

-- Fixtures ---------------------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'dep-owner@example.com', '{"user_name": "dep-owner"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'dep-other@example.com', '{"user_name": "dep-other"}');

insert into public.deployments
  (id, owner_id, flow_id, node_id, provider_service_id, url, spec, spec_hash, status)
values
  ('dep-1', '00000000-0000-0000-0000-0000000000d1', 'flow-a', 'node-1', 'srv-owner-1',
    'https://owner-1.example.com', '{"runtime": "python"}', 'hash-1', 'live'),
  ('dep-2', '00000000-0000-0000-0000-0000000000d1', 'flow-a', 'node-2', 'srv-owner-2',
    null, '{"runtime": "python"}', 'hash-2', 'deploying'),
  ('dep-3', '00000000-0000-0000-0000-0000000000d2', 'flow-b', 'node-1', 'srv-other-1',
    'https://other-1.example.com', '{"runtime": "python"}', 'hash-3', 'live');

-- Schema -----------------------------------------------------------------------------------------

-- RLS is enabled on deployments.
do $$ begin
  assert (select relrowsecurity from pg_class where oid = 'public.deployments'::regclass),
    'RLS not enabled';
end $$;

-- Two rows for the same (owner_id, flow_id, node_id) are rejected.
do $$ begin
  begin
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-dup', '00000000-0000-0000-0000-0000000000d1', 'flow-a', 'node-1', 'srv-new',
      '{}', 'h', 'creating');
    assert false, 'duplicate (owner_id, flow_id, node_id) was accepted';
  exception when unique_violation then null;
  end;
end $$;

-- The same flow and node under another owner is allowed.
begin;
do $$ begin
  insert into public.deployments
    (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
  values ('dep-same-node', '00000000-0000-0000-0000-0000000000d2', 'flow-a', 'node-1', 'srv-new',
    '{}', 'h', 'creating');
  assert exists (select 1 from public.deployments where id = 'dep-same-node'),
    'same flow and node under another owner was rejected';
end $$;
rollback;

-- Two rows with the same provider_service_id are rejected.
do $$ begin
  begin
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-dup', '00000000-0000-0000-0000-0000000000d2', 'flow-z', 'node-z', 'srv-owner-1',
      '{}', 'h', 'creating');
    assert false, 'duplicate provider_service_id was accepted';
  exception when unique_violation then null;
  end;
end $$;

-- status accepts every allowed value.
begin;
do $$
declare s text;
begin
  foreach s in array array['creating', 'deploying', 'live', 'failed', 'suspended'] loop
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-' || s, '00000000-0000-0000-0000-0000000000d2', 'flow-s', 'node-' || s,
      'srv-' || s, '{}', 'h', s);
  end loop;
  assert (select count(*) from public.deployments where flow_id = 'flow-s') = 5,
    'an allowed status was rejected';
end $$;
rollback;

-- status rejects a value outside the allowed set.
do $$ begin
  begin
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-bad', '00000000-0000-0000-0000-0000000000d2', 'flow-z', 'node-z', 'srv-bad',
      '{}', 'h', 'running');
    assert false, 'status running was accepted';
  exception when check_violation then null;
  end;
end $$;

-- status rejects a differently cased allowed value.
do $$ begin
  begin
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-bad', '00000000-0000-0000-0000-0000000000d2', 'flow-z', 'node-z', 'srv-bad',
      '{}', 'h', 'LIVE');
    assert false, 'status LIVE was accepted';
  exception when check_violation then null;
  end;
end $$;

-- Deleting the owner's profile deletes their deployments and keeps the others.
begin;
do $$ begin
  delete from public.profiles where id = '00000000-0000-0000-0000-0000000000d1';
  assert not exists (select 1 from public.deployments
    where owner_id = '00000000-0000-0000-0000-0000000000d1'), 'deployments survived profile deletion';
  assert exists (select 1 from public.deployments where id = 'dep-3'), 'another owner''s deployment was deleted';
end $$;
rollback;

-- RLS: authenticated -----------------------------------------------------------------------------

-- An authenticated user reads only their own deployments.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$ begin
  assert (select array_agg(id order by id) from public.deployments) = array['dep-1', 'dep-2'],
    'owner should see exactly their 2 deployments';
end $$;
rollback;

-- An authenticated user does not see another user's deployment even when filtering by its id.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
do $$ begin
  assert not exists (select 1 from public.deployments where id = 'dep-1'), 'foreign deployment visible';
  assert (select count(*) from public.deployments) = 1, 'other user should see only their 1 deployment';
end $$;
rollback;

-- An authenticated user without a profile row sees nothing.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ff', true);
do $$ begin
  assert (select count(*) from public.deployments) = 0, 'unrelated user sees deployments';
end $$;
rollback;

-- An authenticated user cannot insert a deployment, not even their own.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$ begin
  begin
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-mine', '00000000-0000-0000-0000-0000000000d1', 'flow-m', 'node-m', 'srv-mine',
      '{}', 'h', 'creating');
    assert false, 'authenticated insert of own deployment was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- An authenticated user cannot update their own deployment.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
declare n integer;
begin
  begin
    update public.deployments set provider_service_id = 'srv-hijack' where id = 'dep-1';
    get diagnostics n = row_count;
    assert n = 0, 'authenticated update of own deployment affected rows';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
do $$ begin
  assert (select provider_service_id from public.deployments where id = 'dep-1') = 'srv-owner-1',
    'own deployment changed by authenticated update';
end $$;

-- An authenticated user cannot update another user's deployment.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
declare n integer;
begin
  begin
    update public.deployments set status = 'suspended' where id = 'dep-3';
    get diagnostics n = row_count;
    assert n = 0, 'authenticated update of foreign deployment affected rows';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
do $$ begin
  assert (select status from public.deployments where id = 'dep-3') = 'live',
    'foreign deployment changed by authenticated update';
end $$;

-- An authenticated user cannot delete their own deployment.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
declare n integer;
begin
  begin
    delete from public.deployments where id = 'dep-1';
    get diagnostics n = row_count;
    assert n = 0, 'authenticated delete of own deployment affected rows';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
do $$ begin
  assert exists (select 1 from public.deployments where id = 'dep-1'), 'own deployment deleted';
end $$;

-- An authenticated user cannot delete another user's deployment.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
declare n integer;
begin
  begin
    delete from public.deployments where id = 'dep-3';
    get diagnostics n = row_count;
    assert n = 0, 'authenticated delete of foreign deployment affected rows';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
do $$ begin
  assert exists (select 1 from public.deployments where id = 'dep-3'), 'foreign deployment deleted';
end $$;

-- RLS: anon --------------------------------------------------------------------------------------

-- anon cannot read deployments.
begin;
set local role anon;
do $$
declare n integer;
begin
  begin
    select count(*) into n from public.deployments;
    assert n = 0, 'anon reads deployments';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- anon cannot read deployments even with a forged subject claim.
begin;
set local role anon;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
declare n integer;
begin
  begin
    select count(*) into n from public.deployments;
    assert n = 0, 'anon with a subject claim reads deployments';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- anon cannot insert deployments.
begin;
set local role anon;
do $$ begin
  begin
    insert into public.deployments
      (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
    values ('dep-anon', '00000000-0000-0000-0000-0000000000d1', 'flow-n', 'node-n', 'srv-anon',
      '{}', 'h', 'creating');
    assert false, 'anon insert was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- RLS: service_role ------------------------------------------------------------------------------

-- service_role reads every deployment.
begin;
set local role service_role;
do $$ begin
  assert (select count(*) from public.deployments) = 3, 'service_role should see all 3 deployments';
end $$;
rollback;

-- service_role inserts a deployment for any owner.
begin;
set local role service_role;
do $$ begin
  insert into public.deployments
    (id, owner_id, flow_id, node_id, provider_service_id, spec, spec_hash, status)
  values ('dep-svc', '00000000-0000-0000-0000-0000000000d2', 'flow-c', 'node-c', 'srv-svc',
    '{"runtime": "python"}', 'hash-svc', 'creating');
  assert exists (select 1 from public.deployments where id = 'dep-svc'), 'service_role insert not visible';
end $$;
rollback;

-- service_role updates any deployment.
begin;
set local role service_role;
do $$
declare n integer;
begin
  update public.deployments set status = 'suspended', url = 'https://moved.example.com' where id = 'dep-3';
  get diagnostics n = row_count;
  assert n = 1, 'service_role update should affect 1 row';
  assert (select status from public.deployments where id = 'dep-3') = 'suspended',
    'service_role update not applied';
end $$;
rollback;

-- service_role deletes any deployment.
begin;
set local role service_role;
do $$
declare n integer;
begin
  delete from public.deployments where id in ('dep-1', 'dep-3');
  get diagnostics n = row_count;
  assert n = 2, 'service_role delete should affect 2 rows';
end $$;
rollback;

-- Cleanup ----------------------------------------------------------------------------------------

delete from auth.users where id in
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
delete from public.profiles where id in
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
