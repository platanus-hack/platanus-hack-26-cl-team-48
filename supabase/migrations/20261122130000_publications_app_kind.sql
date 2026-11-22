-- Apps: complete solutions for a project, published next to flows and nodes (ADR 0033).

alter table public.publications drop constraint publications_kind_check;
alter table public.publications
  add constraint publications_kind_check check (kind in ('app', 'flow', 'node'));
