-- Whether a version carries the author's state (ADR 0018), so listings need not download it.
alter table public.publication_versions add column has_state boolean not null default false;
