-- Hub of flows and nodes (ADR 0018).

-- Profiles ---------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9-]{3,20}$'),
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "owners edit their profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- GitHub gives user_name, Google and email links do not: fall back to the email's local part.
create function public.handle_base(meta jsonb, email text) returns text
language sql immutable as $$
  with cleaned as (
    select trim(both '-' from left(regexp_replace(
      lower(coalesce(meta ->> 'user_name', meta ->> 'preferred_username', split_part(email, '@', 1), '')),
      '[^a-z0-9]+', '-', 'g'), 15)) as base
  )
  -- Shorter than the 3 characters a handle needs: pad it (rpad would also cut longer ones).
  select case when length(base) < 3 then base || repeat('0', 3 - length(base)) else base end
  from cleaned
$$;

create function public.create_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := public.handle_base(new.raw_user_meta_data, new.email);
  candidate text := base;
begin
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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_profile();

-- Publications -----------------------------------------------------------------------------------

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{1,30}$'),
  kind text not null check (kind in ('flow', 'node')),
  title text not null check (length(title) between 1 and 80),
  description text not null default '' check (length(description) <= 2000),
  tags text[] not null default '{}',
  license text not null default 'MIT',
  latest_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index publications_updated_at on public.publications (updated_at desc);
create index publications_tags on public.publications using gin (tags);

alter table public.publications enable row level security;

create policy "publications are public" on public.publications for select using (true);
create policy "owners create publications" on public.publications for insert
  with check (owner_id = auth.uid());
create policy "owners edit publications" on public.publications for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete publications" on public.publications for delete
  using (owner_id = auth.uid());

-- Versions (immutable) ---------------------------------------------------------------------------

create table public.publication_versions (
  publication_id uuid not null references public.publications (id) on delete cascade,
  version text not null check (version ~ '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$'),
  flow jsonb not null,
  manifest jsonb,
  snapshot_path text,
  created_at timestamptz not null default now(),
  primary key (publication_id, version)
);

alter table public.publication_versions enable row level security;

create policy "versions are public" on public.publication_versions for select using (true);
create policy "owners add versions" on public.publication_versions for insert
  with check (exists (
    select 1 from public.publications p where p.id = publication_id and p.owner_id = auth.uid()
  ));

create function public.semver_key(version text) returns int[]
language sql immutable as $$
  select array_agg(part::int order by ordinality)
  from unnest(string_to_array(split_part(version, '-', 1), '.')) with ordinality as part
$$;

-- A new version must be greater than the latest one; it then becomes the latest.
create function public.advance_latest_version() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  latest text;
begin
  select latest_version into latest from public.publications
    where id = new.publication_id for update;
  if latest is not null and public.semver_key(new.version) <= public.semver_key(latest) then
    raise exception 'version % must be greater than %', new.version, latest
      using errcode = 'check_violation';
  end if;
  update public.publications set latest_version = new.version, updated_at = now()
    where id = new.publication_id;
  return new;
end;
$$;

create trigger before_version_insert before insert on public.publication_versions
  for each row execute function public.advance_latest_version();

-- Listing with the owner's handle, for cards and search.
create view public.hub_publications with (security_invoker = true) as
  select p.*, pr.handle as owner_handle, pr.display_name as owner_name, pr.avatar_url as owner_avatar
  from public.publications p join public.profiles pr on pr.id = p.owner_id;

-- Snapshots (Storage) ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('snapshots', 'snapshots', true, 5242880, array['application/json']);

-- Paths are <publication id>/<version>.json; only the publication's owner writes them.
create policy "owners upload snapshots" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'snapshots'
    and exists (
      select 1 from public.publications p
      where p.id::text = (storage.foldername(name))[1] and p.owner_id = auth.uid()
    )
  );

-- Grants -----------------------------------------------------------------------------------------
-- This project does not grant new tables to the API roles by default; row level security above
-- still decides which rows each role reaches. Versions get no update or delete: they are immutable.

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.publications, public.publication_versions,
  public.hub_publications to anon, authenticated;
grant update (handle, display_name, avatar_url) on public.profiles to authenticated;
grant insert, delete on public.publications to authenticated;
grant update (slug, title, description, tags, license) on public.publications to authenticated;
grant insert on public.publication_versions to authenticated;
