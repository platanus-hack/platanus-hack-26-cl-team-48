-- Guest sessions for onboarding (ADR 0034 §5). An anonymous Supabase user carries a token for the
-- agent, but gets no public profile and cannot write anywhere.

create function public.is_guest() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- Same as 20261121120000_hub.sql, but anonymous users get no profile.
create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := public.handle_base(new.raw_user_meta_data, new.email);
  candidate text := base;
begin
  if new.is_anonymous then
    return new;
  end if;
  while exists (select 1 from public.profiles where handle = candidate) loop
    candidate := base || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', candidate),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Restrictive policies are combined with AND, so they close writes to guests on top of the
-- owner policies that already exist, without editing them.
do $$
declare
  writable text[] := array[
    'public.profiles', 'public.publications', 'public.publication_versions',
    'public.profile_cards', 'public.flows', 'public.flow_drafts', 'public.deployments',
    'public.agent_entities', 'public.agent_edges', 'public.agent_episodes',
    'public.agent_component_cards', 'public.agent_proposals', 'storage.objects'
  ];
  target text;
begin
  foreach target in array writable loop
    execute format(
      'create policy "guests cannot insert" on %s as restrictive for insert to authenticated
         with check (not public.is_guest())', target);
    execute format(
      'create policy "guests cannot update" on %s as restrictive for update to authenticated
         using (not public.is_guest()) with check (not public.is_guest())', target);
    execute format(
      'create policy "guests cannot delete" on %s as restrictive for delete to authenticated
         using (not public.is_guest())', target);
  end loop;
end;
$$;
