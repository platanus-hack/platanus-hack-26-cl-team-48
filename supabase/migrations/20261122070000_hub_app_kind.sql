-- Migration: 20261122070000_hub_app_kind.sql
-- Allow 'app' alongside 'flow' and 'node' in publications table (Minga App kind support)

alter table public.publications drop constraint if exists publications_kind_check;
alter table public.publications add constraint publications_kind_check check (kind in ('app', 'flow', 'node'));
