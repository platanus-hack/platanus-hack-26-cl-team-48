-- ============================================================================
-- MINGA PRODUCTION CATALOG SEED
-- 18 Authors/Profiles across 6 Core Domains + Chilean Regional Verticals
-- 36 Publications (18 Apps, 12 Flujos, 6 Nodos)
-- Enriched with real-world 'Problema que resuelve' and 'Resultados'
-- ============================================================================

-- 0. Temporarily disable version advance trigger to allow idempotent bulk loading
alter table public.publication_versions disable trigger before_version_insert;

-- ----------------------------------------------------------------------------
-- 1. Auth Users & Profiles (18 Authors)
-- ----------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mateo_agrolab@minga.dev', $meta${"user_name":"mateo_agrolab","full_name":"Dr. Mateo Albornoz","avatar_url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000001', 'mateo_agrolab', $dn$Dr. Mateo Albornoz$dn$, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'valencastro_md@minga.dev', $meta${"user_name":"valencastro_md","full_name":"Dra. Valentina Castro","avatar_url":"https://images.unsplash.com/photo-1594824813576-92c81350a416?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000002', 'valencastro_md', $dn$Dra. Valentina Castro$dn$, 'https://images.unsplash.com/photo-1594824813576-92c81350a416?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tomas_edu@minga.dev', $meta${"user_name":"tomas_edu","full_name":"Prof. Tomás Baeza","avatar_url":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000003', 'tomas_edu', $dn$Prof. Tomás Baeza$dn$, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fran_retail@minga.dev', $meta${"user_name":"fran_retail","full_name":"Francisca Silva","avatar_url":"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000004', 'fran_retail', $dn$Francisca Silva$dn$, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rodrigo_geodatos@minga.dev', $meta${"user_name":"rodrigo_geodatos","full_name":"Rodrigo Morales","avatar_url":"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000005', 'rodrigo_geodatos', $dn$Rodrigo Morales$dn$, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'camila_finanzas@minga.dev', $meta${"user_name":"camila_finanzas","full_name":"Camila Vergara","avatar_url":"https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000006', 'camila_finanzas', $dn$Camila Vergara$dn$, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'matias_solar@minga.dev', $meta${"user_name":"matias_solar","full_name":"Ing. Matías Solar","avatar_url":"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000007', 'matias_solar', $dn$Ing. Matías Solar$dn$, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'esteban_estructuras@minga.dev', $meta${"user_name":"esteban_estructuras","full_name":"Ing. Esteban Larraín","avatar_url":"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000008', 'esteban_estructuras', $dn$Ing. Esteban Larraín$dn$, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'don_pepe_almacen@minga.dev', $meta${"user_name":"don_pepe_almacen","full_name":"Don José «Pepe» Donoso","avatar_url":"https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000009', 'don_pepe_almacen', $dn$Don José «Pepe» Donoso$dn$, 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dra_lucia_dental@minga.dev', $meta${"user_name":"dra_lucia_dental","full_name":"Dra. Lucía Valenzuela","avatar_url":"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000010', 'dra_lucia_dental', $dn$Dra. Lucía Valenzuela$dn$, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr_hugo_ganado@minga.dev', $meta${"user_name":"dr_hugo_ganado","full_name":"Dr. Hugo San Martín","avatar_url":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000011', 'dr_hugo_ganado', $dn$Dr. Hugo San Martín$dn$, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ferreteria_central@minga.dev', $meta${"user_name":"ferreteria_central","full_name":"Héctor Carrasco","avatar_url":"https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000012', 'ferreteria_central', $dn$Héctor Carrasco$dn$, 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'camila_cesfam@minga.dev', $meta${"user_name":"camila_cesfam","full_name":"Camila Rojas","avatar_url":"https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000013', 'camila_cesfam', $dn$Camila Rojas$dn$, 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana_coquimbo@minga.dev', $meta${"user_name":"ana_coquimbo","full_name":"Ana Millán","avatar_url":"https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000014', 'ana_coquimbo', $dn$Ana Millán$dn$, 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rodrigo_ancud@minga.dev', $meta${"user_name":"rodrigo_ancud","full_name":"Rodrigo Leiva","avatar_url":"https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000015', 'rodrigo_ancud', $dn$Rodrigo Leiva$dn$, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tomas_saas@minga.dev', $meta${"user_name":"tomas_saas","full_name":"Tomás Ibarra","avatar_url":"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000016', 'tomas_saas', $dn$Tomás Ibarra$dn$, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000017', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'paula_osorno@minga.dev', $meta${"user_name":"paula_osorno","full_name":"Paula Araya","avatar_url":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000017', 'paula_osorno', $dn$Paula Araya$dn$, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000018', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lucia_qpcr@minga.dev', $meta${"user_name":"lucia_qpcr","full_name":"Dra. Lucía Paredes","avatar_url":"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"}$meta$::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, avatar_url, created_at)
values ('a0000000-0000-4000-8000-000000000018', 'lucia_qpcr', $dn$Dra. Lucía Paredes$dn$, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', now())
on conflict (id) do update set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

-- ----------------------------------------------------------------------------
-- 2. Publications (36 items: 18 Apps, 12 Flujos, 6 Nodos)
-- ----------------------------------------------------------------------------

-- Publication 1: [APP] Cadena de Frío y Cosecha de Berries (Maule 🇨🇱 vs Michoacán 🇲🇽) (mateo_agrolab)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'cadena-frio-berries',
  'app',
  $title$Cadena de Frío y Cosecha de Berries (Maule 🇨🇱 vs Michoacán 🇲🇽)$title$,
  $desc$Para exportadores y packings de berries que necesitan saber, a tiempo, cuándo una cámara o un camión refrigerado se sale de rango. Toma la telemetría de temperatura y humedad, limpia las lecturas caídas, calcula el punto de rocío y marca quiebres térmicos y riesgo de helada; termina en un gráfico que compara Maule con Michoacán. Úsala como base cambiando la fuente de sensores y los umbrales de tu fruta.$desc$,
  array['agronomia', 'berries', 'cadena-de-frio', 'iot', 'maule', 'michoacan']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 2: [NODE] Filtro de Sensores Resiliente (mateo_agrolab)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'filtro-sensores-resiliente',
  'node',
  $title$Filtro de Sensores Resiliente$title$,
  $desc$Para cualquier flujo que lea sensores con huecos. Recibe una serie con lecturas nulas y la entrega limpia, con la estrategia que elijas: ignorar los nulos, rellenarlos con cero o interpolar entre los vecinos (por ejemplo, [18.2, 22.1, null, 25.0]). Ponlo justo después de la fuente para que un sensor caído no rompa el resto del flujo.$desc$,
  array['agronomia', 'iot', 'calidad-de-datos', 'sensores', 'resiliencia']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 3: [FLOW] Alerta de Heladas Tardías y Punto de Rocío (mateo_agrolab)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'alerta-heladas-punto-rocio',
  'flow',
  $title$Alerta de Heladas Tardías y Punto de Rocío$title$,
  $desc$Para agricultores con estación meteorológica que quieren adelantarse a una helada. A partir de temperatura y humedad relativa calcula el punto de rocío y entrega un semáforo de riesgo que distingue helada blanca (por radiación) de helada negra. Ajusta los umbrales del semáforo a tu cultivo y a tu zona.$desc$,
  array['agronomia', 'clima', 'heladas', 'punto-de-rocio', 'modulo']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 4: [APP] Scribe Clínico & Traspaso de Guardia SOAP (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000002',
  'scribe-clinico-soap',
  'app',
  $title$Scribe Clínico & Traspaso de Guardia SOAP$title$,
  $desc$Para equipos de urgencia y enfermería que entregan turno con poco tiempo. Ordena la nota de traspaso en formato SOAP (Subjetivo, Objetivo, Análisis, Plan), calcula el puntaje NEWS2 con los signos vitales y revisa dosis pediátricas por superficie corporal; termina en una vista que prioriza a los pacientes que más se deterioran. Es un apoyo a la entrega de turno: no reemplaza el criterio clínico.$desc$,
  array['salud', 'soap', 'urgencias', 'clinical-notes', 'traspaso-de-guardia']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 5: [FLOW] Triage NEWS2 / Deterioro Fisiológico (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000005',
  'a0000000-0000-4000-8000-000000000002',
  'triage-news2',
  'flow',
  $title$Triage NEWS2 / Deterioro Fisiológico$title$,
  $desc$Para servicios de urgencia y hospitalización que quieren detectar antes el deterioro de un paciente. Recibe frecuencia respiratoria, saturación, presión, pulso, conciencia y temperatura, y entrega el puntaje NEWS2 con su nivel de alerta. Sirve como señal temprana: la decisión clínica sigue siendo del equipo.$desc$,
  array['salud', 'urgencias', 'news2', 'triage', 'fisiologia']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 6: [NODE] Dosis Pediátrica por Superficie Corporal (Mosteller) (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000006',
  'a0000000-0000-4000-8000-000000000002',
  'dosis-pediatrica-mosteller',
  'node',
  $title$Dosis Pediátrica por Superficie Corporal (Mosteller)$title$,
  $desc$Para farmacia clínica y pediatría. Recibe peso y talla, calcula la superficie corporal (m²) con la fórmula de Mosteller y la usa para escalar una dosis indicada por m². Úsalo como verificación de cálculo; la dosis final siempre la valida un profesional.$desc$,
  array['salud', 'pediatria', 'farmacologia', 'mosteller', 'dosificacion']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 7: [APP] Laboratorio Escolar de Consumo Eléctrico (tomas_edu)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000007',
  'a0000000-0000-4000-8000-000000000003',
  'laboratorio-escolar-electricidad',
  'app',
  $title$Laboratorio Escolar de Consumo Eléctrico$title$,
  $desc$Para profesores de ciencias que quieren enseñar análisis de datos con datos reales de su colegio. Toma las lecturas del medidor eléctrico, las agrupa por bloque de clases y recreos, detecta consumos fuera de lo normal (como equipos encendidos de noche) con el método MAD y termina en un gráfico pensado para la sala. Cambia la fuente por el medidor de tu establecimiento.$desc$,
  array['educacion', 'stem', 'energia', 'colegios', 'ciencia-de-datos']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 8: [FLOW] Agrupador Temporal por Bloques Académicos (45 min vs 60 min) (tomas_edu)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000008',
  'a0000000-0000-4000-8000-000000000003',
  'agrupador-bloques-academicos',
  'flow',
  $title$Agrupador Temporal por Bloques Académicos (45 min vs 60 min)$title$,
  $desc$Para analizar cualquier serie de tiempo escolar. Recibe registros con fecha y hora y los asigna al bloque de la jornada que corresponde (de 45 o 60 minutos, recreos incluidos), para comparar consumo o actividad por bloque. Ajusta el horario a la jornada de tu colegio.$desc$,
  array['educacion', 'horarios', 'bloques-academicos', 'analitica-escolar']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 9: [NODE] Detector de Outliers MAD para Alumnos (tomas_edu)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000009',
  'a0000000-0000-4000-8000-000000000003',
  'detector-outliers-mad',
  'node',
  $title$Detector de Outliers MAD para Alumnos$title$,
  $desc$Para proyectos escolares de STEM que necesitan encontrar valores raros sin estadística avanzada. Recibe una columna numérica y marca los datos que se alejan de la mediana según la desviación absoluta mediana (MAD), un método robusto y fácil de explicar en clases. Puedes ajustar la sensibilidad con un solo parámetro.$desc$,
  array['educacion', 'estadistica', 'mad', 'outliers', 'didactico']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 10: [APP] Radar de Demanda y Compras Agrupadas para Almacenes (fran_retail)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000004',
  'radar-compras-agrupadas',
  'app',
  $title$Radar de Demanda y Compras Agrupadas para Almacenes$title$,
  $desc$Para almacenes de barrio y minimarkets que quieren comprar en conjunto y conseguir mejor precio. Junta los pedidos de varios almacenes, revisa el margen real de cada producto sin IVA, calcula cuándo reponer y entrega un resumen consolidado para negociar con la distribuidora. Úsala como base cambiando la lista de almacenes y productos.$desc$,
  array['pymes', 'almacenes', 'compras-colectivas', 'inventario', 'abastecimiento']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 11: [FLOW] Punto de Reorden con Stock de Seguridad (fran_retail)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000011',
  'a0000000-0000-4000-8000-000000000004',
  'punto-reorden-stock-seguridad',
  'flow',
  $title$Punto de Reorden con Stock de Seguridad$title$,
  $desc$Para minoristas que se quedan sin stock o compran de más. Recibe la venta diaria, su variación y el plazo de entrega del proveedor, y entrega el punto de reorden con su stock de seguridad. Ajusta el nivel de servicio según cuánto te cuesta quedarte sin un producto.$desc$,
  array['pymes', 'logistica', 'inventario', 'stock-seguridad', 'reorden']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 12: [NODE] Validador de Margen Neto con IVA Descontado (fran_retail)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000012',
  'a0000000-0000-4000-8000-000000000004',
  'validador-margen-neto-iva',
  'node',
  $title$Validador de Margen Neto con IVA Descontado$title$,
  $desc$Para negocios que fijan precios con IVA incluido y no saben cuánto ganan realmente. Recibe el precio de venta y el costo de cada producto, descuenta el IVA y entrega el margen de contribución real por producto. Cambia la tasa si tu país usa otra.$desc$,
  array['pymes', 'precios', 'iva', 'margen', 'contabilidad']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 13: [APP] Observatorio Comunal de Calidad del Aire (SINCA Chile / Censo H3) (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000013',
  'a0000000-0000-4000-8000-000000000005',
  'observatorio-calidad-aire-sinca',
  'app',
  $title$Observatorio Comunal de Calidad del Aire (SINCA Chile / Censo H3)$title$,
  $desc$Para municipios y equipos de salud pública que quieren saber dónde el aire hace más daño. Toma los datos abiertos de calidad del aire del SINCA (MP2,5 y MP10 por hora), los agrega en hexágonos H3, los cruza con la población vulnerable del Censo y termina en un mapa de riesgo por barrio. Cambia la comuna o la fuente de datos para usarla en otra ciudad.$desc$,
  array['datos-publicos', 'sinca', 'medio-ambiente', 'h3', 'chile', 'salud-publica']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 14: [FLOW] Indexador Hexagonal Uber H3 (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000014',
  'a0000000-0000-4000-8000-000000000005',
  'indexador-hexagonal-h3',
  'flow',
  $title$Indexador Hexagonal Uber H3$title$,
  $desc$Para cualquier flujo con coordenadas. Recibe puntos con latitud y longitud y les asigna su hexágono H3 en resolución 7, 8 u 9, para agregar y comparar zonas sin cargar mapas pesados. Elige la resolución según el tamaño de barrio que te interesa.$desc$,
  array['datos-publicos', 'geoespacial', 'h3', 'uber-h3', 'gis']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 15: [NODE] Índice de Calor Urbano Normalizado (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000015',
  'a0000000-0000-4000-8000-000000000005',
  'indice-calor-urbano-normalizado',
  'node',
  $title$Índice de Calor Urbano Normalizado$title$,
  $desc$Para equipos de urbanismo y medio ambiente. Recibe temperatura de superficie por zona y calcula un índice de isla de calor normalizado, para ver qué barrios se calientan más que el resto de la ciudad y dónde falta arbolado.$desc$,
  array['datos-publicos', 'clima-urbano', 'uhi', 'isla-de-calor', 'gis']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 16: [APP] Centinela de Flujo de Caja y Cobranza Preventiva (camila_finanzas)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000016',
  'a0000000-0000-4000-8000-000000000006',
  'centinela-flujo-caja',
  'app',
  $title$Centinela de Flujo de Caja y Cobranza Preventiva$title$,
  $desc$Para pymes que facturan electrónicamente y sufren por pagos atrasados. Toma las facturas emitidas, clasifica a los clientes según cómo pagan, calcula el interés por mora según la Ley 18.010 y la ley de Pago a 30 Días, y proyecta la caja de los próximos 90 días. Cambia la fuente por la exportación de facturas de tu empresa.$desc$,
  array['finanzas', 'flujo-de-caja', 'cobranza', 'facturacion', 'scoring-b2b']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 17: [FLOW] Scoring de Cumplimiento de Clientes (camila_finanzas)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000017',
  'a0000000-0000-4000-8000-000000000006',
  'scoring-cumplimiento-clientes',
  'flow',
  $title$Scoring de Cumplimiento de Clientes$title$,
  $desc$Para empresas que venden con crédito a otras empresas. Recibe el historial de pagos y entrega un puntaje por cliente según días promedio de cobro (DSO) y días de mora acumulados, para decidir a quién seguir dando crédito.$desc$,
  array['finanzas', 'credito', 'scoring', 'riesgo', 'clientes']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 18: [NODE] Calculador de Interés Penal Diario Legal (camila_finanzas)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000018',
  'a0000000-0000-4000-8000-000000000006',
  'calculador-interes-penal-legal',
  'node',
  $title$Calculador de Interés Penal Diario Legal$title$,
  $desc$Para administración y cobranza en Chile. Recibe el monto, la fecha de vencimiento y la fecha de pago, y calcula el interés por mora con la tasa de interés corriente de la Ley 18.010. Actualiza la tasa cada mes con la que publica la CMF.$desc$,
  array['finanzas', 'legal', 'interes-moratorio', 'ley-18010', 'chile']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 19: [APP] Predictor de Generación Fotovoltaica y Degradación de Paneles (matias_solar)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000019',
  'a0000000-0000-4000-8000-000000000007',
  'predictor-generacion-solar',
  'app',
  $title$Predictor de Generación Fotovoltaica y Degradación de Paneles$title$,
  $desc$Para operadores y desarrolladores de plantas fotovoltaicas. Toma la radiación medida por el piranómetro, calcula la irradiancia sobre el plano inclinado de los paneles (GTI), descuenta las pérdidas por suciedad y termina en un gráfico de generación diaria esperada en MWh. Ajusta la inclinación y la tasa de suciedad a tu planta.$desc$,
  array['energia', 'solar', 'fotovoltaica', 'atacama', 'irradiancia']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 20: [APP] Espectro de Diseño Sísmico NCh433 & Verificación de Deriva (esteban_estructuras)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000020',
  'a0000000-0000-4000-8000-000000000008',
  'espectro-diseno-sismico-nch433',
  'app',
  $title$Espectro de Diseño Sísmico NCh433 & Verificación de Deriva$title$,
  $desc$Para ingenieros estructurales en Chile. A partir de la zona sísmica, el tipo de suelo y la categoría del edificio, genera el espectro elástico de diseño y calcula el corte basal mínimo según la NCh433 Of.96 Mod. 2009, y lo muestra en un gráfico. Es una ayuda de cálculo: la memoria estructural la firma el profesional responsable.$desc$,
  array['ingenieria-civil', 'sismica', 'nch433', 'estructuras', 'chile']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 21: [APP] Cuadre de Caja Diario y Punto de Equilibrio de Abarrotes (don_pepe_almacen)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000021',
  'a0000000-0000-4000-8000-000000000009',
  'cuadre-caja-equilibrio-abarrotes',
  'app',
  $title$Cuadre de Caja Diario y Punto de Equilibrio de Abarrotes$title$,
  $desc$Para el almacén de barrio que cierra la caja a mano. Junta las ventas del día en efectivo, tarjeta y fiado, y calcula cuánto hay que vender para cubrir arriendo, luz y demás costos fijos. Cambia los costos fijos por los de tu local.$desc$,
  array['abarrotes', 'caja-diaria', 'punto-equilibrio', 'almacen']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 22: [APP] Control de Insumos Clínicos y Trazabilidad de Esterilización (dra_lucia_dental)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000022',
  'a0000000-0000-4000-8000-000000000010',
  'control-insumos-box-dental',
  'app',
  $title$Control de Insumos Clínicos y Trazabilidad de Esterilización$title$,
  $desc$Para clínicas dentales que quieren dejar de perder insumos vencidos. Lleva el stock de resinas, anestubos y arcos de ortodoncia, filtra los que vencen pronto y registra los lotes que pasaron por el autoclave. Cambia la lista de insumos por la de tu clínica.$desc$,
  array['odontologia', 'insumos-dentales', 'esterilizacion', 'clinica']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 23: [APP] Monitoreo de Rebaño Lechero y Curvas de Lactancia (dr_hugo_ganado)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000023',
  'a0000000-0000-4000-8000-000000000011',
  'control-rebao-curva-lactancia',
  'app',
  $title$Monitoreo de Rebaño Lechero y Curvas de Lactancia$title$,
  $desc$Para lecherías del sur de Chile. Toma el control lechero diario por vaca, proyecta su curva de lactancia (modelo de Wood) y avisa cuando la producción cae de golpe, una señal temprana de mastitis subclínica. Ajusta el umbral de caída a tu rebaño.$desc$,
  array['veterinaria', 'ganaderia', 'leche', 'bovinos', 'los-lagos']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 24: [APP] Matriz ABC y Reposición de Inventario Ferretero (ferreteria_central)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000024',
  'a0000000-0000-4000-8000-000000000012',
  'matriz-abc-inventario-ferretero',
  'app',
  $title$Matriz ABC y Reposición de Inventario Ferretero$title$,
  $desc$Para ferreterías con miles de productos. Clasifica cada artículo en A, B o C según cuánto dinero mueve y cuánto rota, filtra los clase A y prepara la reposición quincenal. Cambia la frecuencia de reposición según tus proveedores.$desc$,
  array['ferreteria', 'inventario-abc', 'materiales', 'sku']::text[],
  'MIT',
  '1.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 25: [APP] Controles crónicos atrasados (camila_cesfam)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000025',
  'a0000000-0000-4000-8000-000000000013',
  'controles-cronicos-atrasados',
  'app',
  $title$Controles crónicos atrasados$title$,
  $desc$Para equipos de CESFAM que quieren recuperar a pacientes crónicos que dejaron de venir. Cruza los retiros de medicamentos en farmacia con la agenda médica, encuentra a los pacientes con diabetes o hipertensión que llevan más de 6 meses sin control y entrega la lista para contactarlos. Se probó en el CESFAM Padre Las Casas con 214 fichas.$desc$,
  array['salud', 'cesfam', 'cronicos', 'se-trenza', 'probada-con-214-fichas']::text[],
  'MIT',
  '1.3.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 26: [APP] Limpieza del censo comunal (ana_coquimbo)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000026',
  'a0000000-0000-4000-8000-000000000014',
  'limpieza-censo-comunal',
  'app',
  $title$Limpieza del censo comunal$title$,
  $desc$Para municipios que trabajan con direcciones desordenadas. Normaliza direcciones irregulares, incluidas tomas de terreno y sectores rurales, y las ubica en la grilla censal. Nació en Coquimbo; cuando otros municipios la usaron y falló con direcciones rurales, un geógrafo de la comunidad la reparó y hoy corre validada.$desc$,
  array['datos-publicos', 'censo', 'coquimbo', 'se-empalma', 'reparada-y-probada-de-nuevo']::text[],
  'MIT',
  '2.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 27: [APP] Asistencia escolar por curso (rodrigo_ancud)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000027',
  'a0000000-0000-4000-8000-000000000015',
  'asistencia-escolar-curso',
  'app',
  $title$Asistencia escolar por curso$title$,
  $desc$Para colegios que quieren detectar el ausentismo crónico antes de que sea deserción. Toma el libro de asistencia, cruza las ausencias con días de lluvia y el aislamiento de cada estudiante, y avisa qué cursos y alumnos necesitan apoyo psicosocial. Se probó en 6 colegios de Ancud, en Chiloé.$desc$,
  array['educacion', 'asistencia', 'chiloe', 'se-trenza', 'probada-en-6-colegios']::text[],
  'MIT',
  '1.4.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 28: [APP] Churn mensual de suscriptores (tomas_saas)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000028',
  'a0000000-0000-4000-8000-000000000016',
  'churn-mensual-suscriptores',
  'app',
  $title$Churn mensual de suscriptores$title$,
  $desc$Para negocios con suscripciones que quieren entender por qué se van sus clientes. Toma las suscripciones activas, filtra las bajas del mes y las muestra por cohorte. Nació en Valparaíso para clientes personas; una adaptación para empresas chocó con esa regla y el agente propuso una solución que todavía espera revisión humana.$desc$,
  array['ventas', 'churn', 'saas', 'se-enreda', 'propuesta-agente-sin-revisar']::text[],
  'MIT',
  '1.2.0-conflict',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 29: [APP] Quiebres de stock en bodega (paula_osorno)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000029',
  'a0000000-0000-4000-8000-000000000017',
  'quiebres-stock-bodega',
  'app',
  $title$Quiebres de stock en bodega$title$,
  $desc$Para bodegas que quieren enterarse de los quiebres de stock antes que el cliente. Revisa el inventario, detecta los productos por debajo del mínimo y avisa a compras. Se diseñó para abarrotes secos en Osorno; al probarla en una bodega de lácteos falló, porque no considera vencimientos cortos. Espera que alguien de la comunidad la adapte.$desc$,
  array['ventas', 'bodega', 'mermas', 'se-triza', 'fallo-datos-otra-bodega']::text[],
  'MIT',
  '1.1.0-broken',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 30: [NODE] Normalización de qPCR (lucia_qpcr)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000030',
  'a0000000-0000-4000-8000-000000000018',
  'normalizacion-qpcr',
  'node',
  $title$Normalización de qPCR$title$,
  $desc$Para laboratorios de biología molecular. Recibe los ciclos umbral (Cq) de una placa de qPCR y los normaliza contra genes de referencia como GAPDH o actina, para comparar expresión entre muestras. Viene de la Universidad de Concepción y todavía no se ha probado fuera de ese laboratorio: es una buena primera pieza para adaptar.$desc$,
  array['laboratorio', 'qpcr', 'biologia-molecular', 'sin-adaptar', 'sin-probar-fuera-laboratorio']::text[],
  'MIT',
  '0.1.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 31: [APP] Mitigación de Islas de Calor y Corredores Verdes Urbanos (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000031',
  'a0000000-0000-4000-8000-000000000005',
  'arborizacion-global',
  'app',
  $title$Mitigación de Islas de Calor y Corredores Verdes Urbanos$title$,
  $desc$Para ciudades que quieren plantar árboles donde más se necesitan. Cruza imágenes satelitales abiertas (Landsat o Sentinel) en una grilla hexagonal con la densidad de adultos mayores, y prioriza las calles donde reforestar baja más la temperatura para las personas más expuestas. Pensada para adaptarse a Sevilla, Phoenix, Monterrey o Santiago.$desc$,
  array['global', 'clima', 'ciudades', 'arboles', 'islas-de-calor', 'urbanismo']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 32: [APP] Optimización de Sondajes y Valor de la Información (esteban_estructuras)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000032',
  'a0000000-0000-4000-8000-000000000008',
  'sondajes-mineros-global',
  'app',
  $title$Optimización de Sondajes y Valor de la Información$title$,
  $desc$Para equipos de exploración minera o hídrica que deben decidir dónde perforar el próximo pozo. Estima el recurso en 3D a partir de los sondajes existentes, calcula cuánto cuesta la incertidumbre que queda y sugiere la ubicación que más la reduce por cada peso invertido. Pensada para adaptarse a Nevada, Zacatecas, Mendoza o Antofagasta.$desc$,
  array['global', 'geologia', 'mineria', 'agua', 'sondajes', 'bayesian']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 33: [APP] Análisis Biomecánico y Cinemática Deportiva por Video (fran_retail)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000033',
  'a0000000-0000-4000-8000-000000000004',
  'biomecanica-deportiva-global',
  'app',
  $title$Análisis Biomecánico y Cinemática Deportiva por Video$title$,
  $desc$Para entrenadores y analistas deportivos. Toma el video de una carrera, sigue a cada atleta y proyecta su trayectoria sobre las medidas reales de la pista, el velódromo o la piscina, para calcular cuántos metros de más recorrió en las curvas. Como los cálculos salen de la geometría de la pista, el relato que genera se apoya en medidas y no en suposiciones.$desc$,
  array['global', 'deporte', 'atletismo', 'video', 'cinematica', 'biomecanica']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 34: [APP] Capacidad de Carga y Estrés de Recursos para Megaproyectos (matias_solar)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000034',
  'a0000000-0000-4000-8000-000000000007',
  'estres-recursos-global',
  'app',
  $title$Capacidad de Carga y Estrés de Recursos para Megaproyectos$title$,
  $desc$Para comunidades, autoridades y empresas que evalúan un centro de datos o una planta industrial. Proyecta cuánta agua y energía consumirá el proyecto y lo compara con lo que la cuenca puede recargar, para saber si el territorio lo soporta. Pensada para adaptarse a Querétaro, Frankfurt, Virginia o Santiago.$desc$,
  array['global', 'medio-ambiente', 'datacenters', 'agua', 'energia', 'sostenibilidad']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 35: [APP] Gestión Preventiva de Drenaje e Inundaciones Pluviales (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000035',
  'a0000000-0000-4000-8000-000000000005',
  'drenaje-inundaciones-global',
  'app',
  $title$Gestión Preventiva de Drenaje e Inundaciones Pluviales$title$,
  $desc$Para municipios que quieren limpiar los sumideros antes de la lluvia, no después. Cruza el pronóstico de lluvia por hora con la topografía y la capacidad de los sumideros, y prioriza a dónde mandar las cuadrillas antes de que se inunden las calles. Pensada para adaptarse a Guayaquil, Buenos Aires, Miami o Manila.$desc$,
  array['global', 'hidrologia', 'ciudades', 'drenaje', 'inundaciones', 'emergencias']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- Publication 36: [APP] Sandbox de Confiabilidad y Auditoría Forense de Agentes (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000036',
  'a0000000-0000-4000-8000-000000000002',
  'auditoria-agentes-global',
  'app',
  $title$Sandbox de Confiabilidad y Auditoría Forense de Agentes$title$,
  $desc$Para equipos que van a darle permisos reales a un agente de IA. Lo pone en un entorno aislado, le presenta pruebas adversarias y credenciales señuelo, y compara lo que el agente dice que hizo con lo que realmente hizo. Así se sabe si es confiable antes de conectarlo a sistemas reales.$desc$,
  array['global', 'seguridad', 'agentes', 'sandbox', 'red-teaming', 'alineacion']::text[],
  'MIT',
  '0.2.0',
  now(),
  now()
)
on conflict (owner_id, slug) do update set
  kind = excluded.kind,
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  latest_version = excluded.latest_version,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 3. Publication Versions (Graphs, Snapshots, and Manifests)
-- ----------------------------------------------------------------------------

-- Version for cadena-frio-berries v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000001',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Cadena de Frío y Cosecha de Berries","nodes":[{"id":"telemetria_iot","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://berries/telemetria.csv"},"position":{"x":0,"y":0},"label":"Sensores IoT"},{"id":"filtro_resiliente","type":"hub.agronomia.filtro-sensores","version":"0.1.0","params":{"strategy":"ignore_nulls"},"position":{"x":780,"y":0},"label":"Filtro Resiliente"},{"id":"alerta_heladas","type":"hub.agronomia.alerta-heladas","version":"0.1.0","params":{"umbral_helada":2},"position":{"x":1040,"y":0},"label":"Alerta Heladas & Rocío"},{"id":"grafico_comparativo","type":"core.view.bar","version":"0.1.0","params":{"x":"zona","y":"temperatura_c","title":"Temperatura por Zona"},"position":{"x":1560,"y":0},"label":"Comparativa Maule vs Michoacán"},{"id":"rutas_camiones","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://berries/rutas.csv"},"position":{"x":0,"y":150},"label":"Rutas y destinos"},{"id":"unir_rutas","type":"core.join","version":"0.1.0","params":{"leftColumn":"camion_id","rightColumn":"camion_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir lecturas con su ruta"},{"id":"tipos_lectura","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"timestamp","to":"date-iso"},{"column":"temperatura_c","to":"number"},{"column":"humedad_relativa","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar fechas y números"},{"id":"exceso_termico","type":"core.formula","version":"0.1.0","params":{"name":"exceso_c","column":"temperatura_c","op":"-","value":2},"position":{"x":1300,"y":0},"label":"Grados sobre el máximo"},{"id":"solo_quiebres","type":"core.filter","version":"0.1.0","params":{"column":"exceso_c","op":">","value":"0"},"position":{"x":1560,"y":150},"label":"Solo quiebres de frío"},{"id":"resumen_camion","type":"core.group","version":"0.1.0","params":{"groupBy":["zona","camion_id"],"aggregations":[{"column":"temperatura_c","fn":"MAX","name":"temp_max"},{"column":"exceso_c","fn":"SUM","name":"grados_hora"},{"column":"humedad_relativa","fn":"AVG","name":"humedad_prom"}]},"position":{"x":1820,"y":0},"label":"Resumen por camión"},{"id":"ranking_camiones","type":"core.sort","version":"0.1.0","params":{"column":"grados_hora","direction":"DESC"},"position":{"x":2080,"y":0},"label":"Camiones más expuestos"},{"id":"curva_temperatura","type":"core.view.line","version":"0.1.0","params":{"x":"timestamp","y":"temperatura_c","series":"zona"},"position":{"x":1560,"y":300},"label":"Temperatura en el tiempo"},{"id":"detalle_quiebres","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":150},"label":"Quiebres para revisar"}],"edges":[{"id":"telemetria_iot_out__unir_rutas_left","from":{"node":"telemetria_iot","port":"out"},"to":{"node":"unir_rutas","port":"left"}},{"id":"rutas_camiones_out__unir_rutas_right","from":{"node":"rutas_camiones","port":"out"},"to":{"node":"unir_rutas","port":"right"}},{"id":"unir_rutas_out__tipos_lectura_in","from":{"node":"unir_rutas","port":"out"},"to":{"node":"tipos_lectura","port":"in"}},{"id":"tipos_lectura_out__filtro_resiliente_in","from":{"node":"tipos_lectura","port":"out"},"to":{"node":"filtro_resiliente","port":"in"}},{"id":"filtro_resiliente_out__alerta_heladas_in","from":{"node":"filtro_resiliente","port":"out"},"to":{"node":"alerta_heladas","port":"in"}},{"id":"alerta_heladas_out__exceso_termico_in","from":{"node":"alerta_heladas","port":"out"},"to":{"node":"exceso_termico","port":"in"}},{"id":"exceso_termico_out__grafico_comparativo_in","from":{"node":"exceso_termico","port":"out"},"to":{"node":"grafico_comparativo","port":"in"}},{"id":"exceso_termico_out__curva_temperatura_in","from":{"node":"exceso_termico","port":"out"},"to":{"node":"curva_temperatura","port":"in"}},{"id":"exceso_termico_out__solo_quiebres_in","from":{"node":"exceso_termico","port":"out"},"to":{"node":"solo_quiebres","port":"in"}},{"id":"solo_quiebres_out__resumen_camion_in","from":{"node":"solo_quiebres","port":"out"},"to":{"node":"resumen_camion","port":"in"}},{"id":"resumen_camion_out__ranking_camiones_in","from":{"node":"resumen_camion","port":"out"},"to":{"node":"ranking_camiones","port":"in"}},{"id":"solo_quiebres_out__detalle_quiebres_in","from":{"node":"solo_quiebres","port":"out"},"to":{"node":"detalle_quiebres","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for filtro-sensores-resiliente v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000002',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Filtro de Sensores Resiliente Demo","nodes":[{"id":"n1","type":"hub.agronomia.filtro-sensores","version":"0.1.0","params":{"strategy":"ignore_nulls"},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.agronomia.filtro-sensores","version":"0.1.0","name":"Filtro de Sensores Resiliente","description":"Filtro tolerante a fallas para telemetría de frío. Permite ignorar nulos, imputar con cero o interpolar en series como [18, 22, null, 25] sin quebrar el pipeline.","category":"Agronomía / IoT","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"strategy":{"type":"string","enum":["ignore_nulls","average_zero","interpolate"],"default":"ignore_nulls"},"column":{"type":"string","default":"temperatura_c"},"min_valid":{"type":"number","default":-10},"max_valid":{"type":"number","default":45}},"required":["strategy","column"]},"impl":{"kind":"python","entry":"filter_telemetry","code":"def filter_telemetry(data, params):\n    col = params.get(\"column\", \"temperatura_c\")\n    strategy = params.get(\"strategy\", \"ignore_nulls\")\n    clean = []\n    for row in data:\n        val = row.get(col)\n        if val is None:\n            if strategy == \"ignore_nulls\":\n                continue\n            elif strategy == \"average_zero\":\n                row[col] = 0.0\n        clean.append(row)\n    return clean"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for alerta-heladas-punto-rocio v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000003',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Alerta de Heladas Tardías Demo","nodes":[{"id":"n1","type":"hub.agronomia.alerta-heladas","version":"0.1.0","params":{},"position":{"x":780,"y":0}},{"id":"estacion","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://agro/estacion.csv"},"position":{"x":0,"y":0},"label":"Estación meteorológica"},{"id":"tipos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"temperatura_c","to":"number"},{"column":"humedad_relativa","to":"number"}]},"position":{"x":260,"y":0},"label":"Normalizar lecturas"},{"id":"rango_valido","type":"core.filter","version":"0.1.0","params":{"column":"humedad_relativa","op":"<=","value":"100"},"position":{"x":520,"y":0},"label":"Descartar lecturas imposibles"},{"id":"mas_frias","type":"core.sort","version":"0.1.0","params":{"column":"punto_rocio_c","direction":"ASC"},"position":{"x":1040,"y":0},"label":"Horas más frías primero"},{"id":"alertas","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":0},"label":"Semáforo de heladas"}],"edges":[{"id":"estacion_out__tipos_in","from":{"node":"estacion","port":"out"},"to":{"node":"tipos","port":"in"}},{"id":"tipos_out__rango_valido_in","from":{"node":"tipos","port":"out"},"to":{"node":"rango_valido","port":"in"}},{"id":"rango_valido_out__n1_in","from":{"node":"rango_valido","port":"out"},"to":{"node":"n1","port":"in"}},{"id":"n1_out__mas_frias_in","from":{"node":"n1","port":"out"},"to":{"node":"mas_frias","port":"in"}},{"id":"mas_frias_out__alertas_in","from":{"node":"mas_frias","port":"out"},"to":{"node":"alertas","port":"in"}}]}$flow$::jsonb,
  $manifest${"id":"hub.agronomia.alerta-heladas","version":"0.1.0","name":"Alerta de Heladas Tardías y Punto de Rocío","description":"Módulo compuesto que calcula el punto de rocío psicrométrico (Magnus) y emite semáforo de riesgo de helada y quiebre de frío en huertos y cámaras.","category":"Agronomía / Clima","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_helada":{"type":"number","default":2},"temp_col":{"type":"string","default":"temperatura_c"},"hum_col":{"type":"string","default":"humedad_relativa"}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"m_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"m_dew","type":"hub.agronomia.calc-rocio","version":"0.1.0","params":{"a":17.27,"b":237.7},"position":{"x":260,"y":0},"label":"Magnus-Tetens"},{"id":"m_semaforo","type":"core.filter","version":"0.1.0","params":{"column":"punto_rocio_c","op":"<","value":"3.0"},"position":{"x":520,"y":0},"label":"Alerta crítica"},{"id":"m_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":780,"y":0}}],"edges":[{"id":"m_in_out__m_dew_in","from":{"node":"m_in","port":"out"},"to":{"node":"m_dew","port":"in"}},{"id":"m_dew_out__m_semaforo_in","from":{"node":"m_dew","port":"out"},"to":{"node":"m_semaforo","port":"in"}},{"id":"m_semaforo_out__m_out_in","from":{"node":"m_semaforo","port":"out"},"to":{"node":"m_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for scribe-clinico-soap v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000004',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Scribe Clínico & Traspaso de Guardia SOAP","nodes":[{"id":"audio_transcripcion","type":"core.source.csv","version":"0.1.0","params":{"path":"guardia_urgencias.csv"},"position":{"x":0,"y":0},"label":"Transcripción de Turno"},{"id":"evaluador_news2","type":"hub.salud.triage-news2","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Triage NEWS2"},{"id":"calculador_mosteller","type":"hub.salud.dosis-mosteller","version":"0.1.0","params":{"dosis_mg_m2":150},"position":{"x":1040,"y":0},"label":"Dosis Pediátrica"},{"id":"vista_prioridad","type":"core.view.bar","version":"0.1.0","params":{"x":"cama_id","y":"news2_score","title":"Prioridad Pacientes"},"position":{"x":1300,"y":0},"label":"Tablero de Urgencia"},{"id":"ficha_pacientes","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://urgencias/fichas.csv"},"position":{"x":0,"y":150},"label":"Ficha y peso de pacientes"},{"id":"unir_ficha","type":"core.join","version":"0.1.0","params":{"leftColumn":"cama_id","rightColumn":"cama_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir nota con ficha"},{"id":"tipos_signos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"frec_respiratoria","to":"number"},{"column":"sat_o2","to":"number"},{"column":"edad_anos","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar signos vitales"},{"id":"pacientes_riesgo","type":"core.filter","version":"0.1.0","params":{"column":"news2_score","op":">=","value":"5"},"position":{"x":1300,"y":150},"label":"NEWS2 de 5 o más"},{"id":"resumen_riesgo","type":"core.group","version":"0.1.0","params":{"groupBy":["riesgo_clinico"],"aggregations":[{"column":"cama_id","fn":"COUNT","name":"pacientes"},{"column":"news2_score","fn":"AVG","name":"news2_prom"}]},"position":{"x":1300,"y":300},"label":"Pacientes por nivel de riesgo"},{"id":"prioridad_camas","type":"core.sort","version":"0.1.0","params":{"column":"news2_score","direction":"DESC"},"position":{"x":1560,"y":0},"label":"Orden de atención"},{"id":"lista_traspaso","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":0},"label":"Lista para el traspaso"},{"id":"revision_dosis","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":450},"label":"Dosis para revisar"}],"edges":[{"id":"audio_transcripcion_out__unir_ficha_left","from":{"node":"audio_transcripcion","port":"out"},"to":{"node":"unir_ficha","port":"left"}},{"id":"ficha_pacientes_out__unir_ficha_right","from":{"node":"ficha_pacientes","port":"out"},"to":{"node":"unir_ficha","port":"right"}},{"id":"unir_ficha_out__tipos_signos_in","from":{"node":"unir_ficha","port":"out"},"to":{"node":"tipos_signos","port":"in"}},{"id":"tipos_signos_out__evaluador_news2_in","from":{"node":"tipos_signos","port":"out"},"to":{"node":"evaluador_news2","port":"in"}},{"id":"evaluador_news2_out__calculador_mosteller_in","from":{"node":"evaluador_news2","port":"out"},"to":{"node":"calculador_mosteller","port":"in"}},{"id":"calculador_mosteller_out__vista_prioridad_in","from":{"node":"calculador_mosteller","port":"out"},"to":{"node":"vista_prioridad","port":"in"}},{"id":"calculador_mosteller_out__pacientes_riesgo_in","from":{"node":"calculador_mosteller","port":"out"},"to":{"node":"pacientes_riesgo","port":"in"}},{"id":"pacientes_riesgo_out__prioridad_camas_in","from":{"node":"pacientes_riesgo","port":"out"},"to":{"node":"prioridad_camas","port":"in"}},{"id":"prioridad_camas_out__lista_traspaso_in","from":{"node":"prioridad_camas","port":"out"},"to":{"node":"lista_traspaso","port":"in"}},{"id":"calculador_mosteller_out__resumen_riesgo_in","from":{"node":"calculador_mosteller","port":"out"},"to":{"node":"resumen_riesgo","port":"in"}},{"id":"calculador_mosteller_out__revision_dosis_in","from":{"node":"calculador_mosteller","port":"out"},"to":{"node":"revision_dosis","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for triage-news2 v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000005',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Triage NEWS2 Demo","nodes":[{"id":"n1","type":"hub.salud.triage-news2","version":"0.1.0","params":{},"position":{"x":780,"y":0}},{"id":"signos","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://urgencias/signos.csv"},"position":{"x":0,"y":0},"label":"Signos vitales"},{"id":"tipos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"frec_respiratoria","to":"number"},{"column":"sat_o2","to":"number"}]},"position":{"x":260,"y":0},"label":"Normalizar signos"},{"id":"con_saturacion","type":"core.filter","version":"0.1.0","params":{"column":"sat_o2","op":">","value":"0"},"position":{"x":520,"y":0},"label":"Con saturación registrada"},{"id":"mas_graves","type":"core.sort","version":"0.1.0","params":{"column":"news2_score","direction":"DESC"},"position":{"x":1040,"y":0},"label":"Más graves primero"},{"id":"tabla_triage","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":0},"label":"Pacientes por puntaje"}],"edges":[{"id":"signos_out__tipos_in","from":{"node":"signos","port":"out"},"to":{"node":"tipos","port":"in"}},{"id":"tipos_out__con_saturacion_in","from":{"node":"tipos","port":"out"},"to":{"node":"con_saturacion","port":"in"}},{"id":"con_saturacion_out__n1_in","from":{"node":"con_saturacion","port":"out"},"to":{"node":"n1","port":"in"}},{"id":"n1_out__mas_graves_in","from":{"node":"n1","port":"out"},"to":{"node":"mas_graves","port":"in"}},{"id":"mas_graves_out__tabla_triage_in","from":{"node":"mas_graves","port":"out"},"to":{"node":"tabla_triage","port":"in"}}]}$flow$::jsonb,
  $manifest${"id":"hub.salud.triage-news2","version":"0.1.0","name":"Triage NEWS2 / Deterioro Fisiológico","description":"Módulo compuesto que implementa el score NEWS2 (Royal College of Physicians) evaluando saturación O2, frecuencia respiratoria, pulso, presión sistólica, temperatura y nivel de consciencia.","category":"Salud / Urgencias","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_alerta_roja":{"type":"number","default":7}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"t_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"t_score","type":"hub.salud.calc-news2","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Score Fisiológico"},{"id":"t_clasifica","type":"core.filter","version":"0.1.0","params":{"column":"news2_score","op":">=","value":"5"},"position":{"x":520,"y":0},"label":"Riesgo Medio/Alto"},{"id":"t_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":780,"y":0}}],"edges":[{"id":"t_in_out__t_score_in","from":{"node":"t_in","port":"out"},"to":{"node":"t_score","port":"in"}},{"id":"t_score_out__t_clasifica_in","from":{"node":"t_score","port":"out"},"to":{"node":"t_clasifica","port":"in"}},{"id":"t_clasifica_out__t_out_in","from":{"node":"t_clasifica","port":"out"},"to":{"node":"t_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for dosis-pediatrica-mosteller v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000006',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Dosis Pediátrica Mosteller Demo","nodes":[{"id":"n1","type":"hub.salud.dosis-mosteller","version":"0.1.0","params":{"dosis_mg_m2":150},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.salud.dosis-mosteller","version":"0.1.0","name":"Dosis Pediátrica por Superficie Corporal (Mosteller)","description":"Cálculo de Body Surface Area (BSA) con la fórmula de Mosteller: BSA = sqrt(peso_kg * talla_cm / 3600), ajustando posología en mg/m² para antibióticos y quimioterapia.","category":"Salud / Pediatría","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"peso_col":{"type":"string","default":"peso_kg"},"talla_col":{"type":"string","default":"talla_cm"},"dosis_mg_m2":{"type":"number","default":150}},"required":["peso_col","talla_col","dosis_mg_m2"]},"impl":{"kind":"python","entry":"calculate_pediatric_dose","code":"import math\ndef calculate_pediatric_dose(patients, params):\n    dosis_base = params.get(\"dosis_mg_m2\", 150.0)\n    for p in patients:\n        peso = p.get(\"peso_kg\", 0.0)\n        talla = p.get(\"talla_cm\", 0.0)\n        bsa = math.sqrt((peso * talla) / 3600.0) if peso > 0 and talla > 0 else 0.0\n        p[\"bsa_m2\"] = round(bsa, 3)\n        p[\"dosis_calculada_mg\"] = round(bsa * dosis_base, 1)\n    return patients"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for laboratorio-escolar-electricidad v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000007',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Laboratorio Escolar de Consumo Eléctrico","nodes":[{"id":"smart_meter","type":"core.source.csv","version":"0.1.0","params":{"path":"liceo_electricidad.csv"},"position":{"x":0,"y":0},"label":"Smart Meter Escolar"},{"id":"agrupador_bloques","type":"hub.educacion.bloques-academicos","version":"0.1.0","params":{"duracion_bloque_min":45},"position":{"x":780,"y":0},"label":"Bloques Académicos"},{"id":"detector_anomalias","type":"hub.educacion.detector-mad","version":"0.1.0","params":{"umbral_mad":2.5},"position":{"x":1040,"y":0},"label":"Detector MAD Alumnos"},{"id":"grafico_pedagogico","type":"core.view.bar","version":"0.1.0","params":{"x":"bloque_pedagogico","y":"kwh","title":"Consumo por Bloque"},"position":{"x":1560,"y":0},"label":"Gráfico Didáctico"},{"id":"horario_colegio","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://colegio/horario.csv"},"position":{"x":0,"y":150},"label":"Horario de clases"},{"id":"unir_horario","type":"core.join","version":"0.1.0","params":{"leftColumn":"hora","rightColumn":"hora","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir lecturas con el horario"},{"id":"tipos_medidor","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"hora","to":"date-iso"},{"column":"kwh","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar lecturas"},{"id":"costo_clp","type":"core.formula","version":"0.1.0","params":{"name":"costo_clp","column":"kwh","op":"*","value":160},"position":{"x":1300,"y":0},"label":"Costo en pesos"},{"id":"solo_fantasmas","type":"core.filter","version":"0.1.0","params":{"column":"consumo_fantasma","op":"=","value":"true"},"position":{"x":1560,"y":150},"label":"Consumo fuera de clases"},{"id":"por_bloque","type":"core.group","version":"0.1.0","params":{"groupBy":["bloque_pedagogico"],"aggregations":[{"column":"kwh","fn":"SUM","name":"kwh_total"},{"column":"costo_clp","fn":"SUM","name":"costo_total"}]},"position":{"x":1560,"y":300},"label":"Consumo por bloque"},{"id":"bloques_caros","type":"core.sort","version":"0.1.0","params":{"column":"kwh_total","direction":"DESC"},"position":{"x":1820,"y":0},"label":"Bloques que más gastan"},{"id":"curva_dia","type":"core.view.line","version":"0.1.0","params":{"x":"hora","y":"kwh"},"position":{"x":1560,"y":450},"label":"Consumo durante el día"},{"id":"tabla_fantasmas","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":150},"label":"Consumos para investigar"}],"edges":[{"id":"smart_meter_out__unir_horario_left","from":{"node":"smart_meter","port":"out"},"to":{"node":"unir_horario","port":"left"}},{"id":"horario_colegio_out__unir_horario_right","from":{"node":"horario_colegio","port":"out"},"to":{"node":"unir_horario","port":"right"}},{"id":"unir_horario_out__tipos_medidor_in","from":{"node":"unir_horario","port":"out"},"to":{"node":"tipos_medidor","port":"in"}},{"id":"tipos_medidor_out__agrupador_bloques_in","from":{"node":"tipos_medidor","port":"out"},"to":{"node":"agrupador_bloques","port":"in"}},{"id":"agrupador_bloques_out__detector_anomalias_in","from":{"node":"agrupador_bloques","port":"out"},"to":{"node":"detector_anomalias","port":"in"}},{"id":"detector_anomalias_out__costo_clp_in","from":{"node":"detector_anomalias","port":"out"},"to":{"node":"costo_clp","port":"in"}},{"id":"costo_clp_out__grafico_pedagogico_in","from":{"node":"costo_clp","port":"out"},"to":{"node":"grafico_pedagogico","port":"in"}},{"id":"costo_clp_out__curva_dia_in","from":{"node":"costo_clp","port":"out"},"to":{"node":"curva_dia","port":"in"}},{"id":"costo_clp_out__por_bloque_in","from":{"node":"costo_clp","port":"out"},"to":{"node":"por_bloque","port":"in"}},{"id":"por_bloque_out__bloques_caros_in","from":{"node":"por_bloque","port":"out"},"to":{"node":"bloques_caros","port":"in"}},{"id":"costo_clp_out__solo_fantasmas_in","from":{"node":"costo_clp","port":"out"},"to":{"node":"solo_fantasmas","port":"in"}},{"id":"solo_fantasmas_out__tabla_fantasmas_in","from":{"node":"solo_fantasmas","port":"out"},"to":{"node":"tabla_fantasmas","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for agrupador-bloques-academicos v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000008',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Bloques Académicos Demo","nodes":[{"id":"n1","type":"hub.educacion.bloques-academicos","version":"0.1.0","params":{},"position":{"x":780,"y":0}},{"id":"registros","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://colegio/registros.csv"},"position":{"x":0,"y":0},"label":"Registros con hora"},{"id":"tipos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"hora","to":"date-iso"}]},"position":{"x":260,"y":0},"label":"Normalizar horas"},{"id":"jornada","type":"core.filter","version":"0.1.0","params":{"column":"hora","op":">=","value":"08:00"},"position":{"x":520,"y":0},"label":"Solo jornada escolar"},{"id":"por_hora","type":"core.sort","version":"0.1.0","params":{"column":"hora","direction":"ASC"},"position":{"x":1040,"y":0},"label":"En orden del día"},{"id":"tabla_bloques","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":0},"label":"Registros por bloque"}],"edges":[{"id":"registros_out__tipos_in","from":{"node":"registros","port":"out"},"to":{"node":"tipos","port":"in"}},{"id":"tipos_out__jornada_in","from":{"node":"tipos","port":"out"},"to":{"node":"jornada","port":"in"}},{"id":"jornada_out__n1_in","from":{"node":"jornada","port":"out"},"to":{"node":"n1","port":"in"}},{"id":"n1_out__por_hora_in","from":{"node":"n1","port":"out"},"to":{"node":"por_hora","port":"in"}},{"id":"por_hora_out__tabla_bloques_in","from":{"node":"por_hora","port":"out"},"to":{"node":"tabla_bloques","port":"in"}}]}$flow$::jsonb,
  $manifest${"id":"hub.educacion.bloques-academicos","version":"0.1.0","name":"Agrupador Temporal por Bloques Académicos (45 min vs 60 min)","description":"Módulo compuesto que mapea marcas de tiempo de medidores eléctricos en bloques lectivos (Clase 1, Recreo, Clase 2, Almuerzo, Noche) para colegios técnicos.","category":"Educación / Horarios","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"duracion_bloque_min":{"type":"number","enum":[45,60],"default":45}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"b_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"b_map","type":"hub.educacion.mapeo-horario","version":"0.1.0","params":{"formato":"chileno_45min"},"position":{"x":260,"y":0},"label":"Bloques Escolares"},{"id":"b_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":520,"y":0}}],"edges":[{"id":"b_in_out__b_map_in","from":{"node":"b_in","port":"out"},"to":{"node":"b_map","port":"in"}},{"id":"b_map_out__b_out_in","from":{"node":"b_map","port":"out"},"to":{"node":"b_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for detector-outliers-mad v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000009',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Detector Outliers MAD Demo","nodes":[{"id":"n1","type":"hub.educacion.detector-mad","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.educacion.detector-mad","version":"0.1.0","name":"Detector de Outliers MAD para Alumnos","description":"Implementación didáctica del estimador Median Absolute Deviation (MAD). Compara visualmente la media con la mediana y etiqueta picos anómalos de consumo.","category":"Educación / Estadística","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"columna_valor":{"type":"string","default":"kwh"},"umbral_mad":{"type":"number","default":2.5}},"required":["columna_valor","umbral_mad"]},"impl":{"kind":"python","entry":"mad_outliers","code":"def mad_outliers(rows, params):\n    col = params.get(\"columna_valor\", \"kwh\")\n    k = params.get(\"umbral_mad\", 2.5)\n    values = sorted([r[col] for r in rows if r.get(col) is not None])\n    if not values:\n        return rows\n    med = values[len(values)//2]\n    diffs = sorted([abs(v - med) for v in values])\n    mad = diffs[len(diffs)//2] or 1.0\n    for r in rows:\n        v = r.get(col, 0)\n        score = abs(v - med) / (1.4826 * mad)\n        r[\"mad_score\"] = round(score, 2)\n        r[\"es_outlier\"] = score > k\n    return rows"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for radar-compras-agrupadas v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000010',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Radar de Demanda y Compras Agrupadas","nodes":[{"id":"pedidos_almacenes","type":"core.source.csv","version":"0.1.0","params":{"path":"pedidos_red_almacenes.csv"},"position":{"x":0,"y":0},"label":"Pedidos de Almacenes"},{"id":"validador_margen","type":"hub.pymes.margen-neto-iva","version":"0.1.0","params":{"tasa_iva":0.19},"position":{"x":780,"y":0},"label":"Márgenes sin IVA"},{"id":"reorden_logistico","type":"hub.pymes.punto-reorden","version":"0.1.0","params":{},"position":{"x":1040,"y":0},"label":"Punto de Reorden"},{"id":"resumen_escala","type":"core.view.bar","version":"0.1.0","params":{"x":"producto","y":"demanda_semanal_bultos","title":"Volumen Mayorista"},"position":{"x":1300,"y":0},"label":"Volumen Colectivo"},{"id":"lista_precios","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://almacenes/precios.csv"},"position":{"x":0,"y":150},"label":"Lista de precios del mayorista"},{"id":"unir_precios","type":"core.join","version":"0.1.0","params":{"leftColumn":"sku","rightColumn":"sku","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir pedidos con precios"},{"id":"tipos_pedido","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"demanda_semanal_bultos","to":"number"},{"column":"stock_actual","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar cantidades"},{"id":"bultos_a_pedir","type":"core.formula","version":"0.1.0","params":{"name":"bultos","column":"punto_reorden","op":"-","otherColumn":"stock_actual"},"position":{"x":1300,"y":150},"label":"Bultos que faltan"},{"id":"bajo_reorden","type":"core.filter","version":"0.1.0","params":{"column":"bultos","op":">","value":"0"},"position":{"x":1560,"y":0},"label":"Bajo el punto de reorden"},{"id":"compra_conjunta","type":"core.group","version":"0.1.0","params":{"groupBy":["sku","producto"],"aggregations":[{"column":"bultos","fn":"SUM","name":"bultos_total"},{"column":"almacen","fn":"COUNT","name":"almacenes"}]},"position":{"x":1820,"y":0},"label":"Compra conjunta por producto"},{"id":"mayor_volumen","type":"core.sort","version":"0.1.0","params":{"column":"bultos_total","direction":"DESC"},"position":{"x":2080,"y":0},"label":"Mayor volumen primero"},{"id":"orden_compra","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":2340,"y":0},"label":"Orden para el distribuidor"},{"id":"ahorro_por_producto","type":"core.view.bar","version":"0.1.0","params":{"x":"producto","y":"ahorro_compra_agrupada_pct","title":"Ahorro por producto"},"position":{"x":1300,"y":300},"label":"Ahorro por producto"}],"edges":[{"id":"pedidos_almacenes_out__unir_precios_left","from":{"node":"pedidos_almacenes","port":"out"},"to":{"node":"unir_precios","port":"left"}},{"id":"lista_precios_out__unir_precios_right","from":{"node":"lista_precios","port":"out"},"to":{"node":"unir_precios","port":"right"}},{"id":"unir_precios_out__tipos_pedido_in","from":{"node":"unir_precios","port":"out"},"to":{"node":"tipos_pedido","port":"in"}},{"id":"tipos_pedido_out__validador_margen_in","from":{"node":"tipos_pedido","port":"out"},"to":{"node":"validador_margen","port":"in"}},{"id":"validador_margen_out__reorden_logistico_in","from":{"node":"validador_margen","port":"out"},"to":{"node":"reorden_logistico","port":"in"}},{"id":"reorden_logistico_out__bultos_a_pedir_in","from":{"node":"reorden_logistico","port":"out"},"to":{"node":"bultos_a_pedir","port":"in"}},{"id":"bultos_a_pedir_out__bajo_reorden_in","from":{"node":"bultos_a_pedir","port":"out"},"to":{"node":"bajo_reorden","port":"in"}},{"id":"bajo_reorden_out__compra_conjunta_in","from":{"node":"bajo_reorden","port":"out"},"to":{"node":"compra_conjunta","port":"in"}},{"id":"compra_conjunta_out__mayor_volumen_in","from":{"node":"compra_conjunta","port":"out"},"to":{"node":"mayor_volumen","port":"in"}},{"id":"mayor_volumen_out__orden_compra_in","from":{"node":"mayor_volumen","port":"out"},"to":{"node":"orden_compra","port":"in"}},{"id":"reorden_logistico_out__resumen_escala_in","from":{"node":"reorden_logistico","port":"out"},"to":{"node":"resumen_escala","port":"in"}},{"id":"reorden_logistico_out__ahorro_por_producto_in","from":{"node":"reorden_logistico","port":"out"},"to":{"node":"ahorro_por_producto","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for punto-reorden-stock-seguridad v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000011',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Punto de Reorden Demo","nodes":[{"id":"n1","type":"hub.pymes.punto-reorden","version":"0.1.0","params":{},"position":{"x":780,"y":0}},{"id":"ventas","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://pymes/ventas.csv"},"position":{"x":0,"y":0},"label":"Ventas diarias"},{"id":"tipos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"venta_diaria","to":"number"},{"column":"plazo_dias","to":"number"}]},"position":{"x":260,"y":0},"label":"Normalizar cantidades"},{"id":"con_venta","type":"core.filter","version":"0.1.0","params":{"column":"venta_diaria","op":">","value":"0"},"position":{"x":520,"y":0},"label":"Productos con venta"},{"id":"faltante","type":"core.formula","version":"0.1.0","params":{"name":"faltante","column":"punto_reorden","op":"-","otherColumn":"stock_actual"},"position":{"x":1040,"y":0},"label":"Unidades bajo el punto"},{"id":"urgentes","type":"core.sort","version":"0.1.0","params":{"column":"faltante","direction":"DESC"},"position":{"x":1300,"y":0},"label":"Más urgentes primero"},{"id":"tabla_reorden","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":0},"label":"Qué reponer"}],"edges":[{"id":"ventas_out__tipos_in","from":{"node":"ventas","port":"out"},"to":{"node":"tipos","port":"in"}},{"id":"tipos_out__con_venta_in","from":{"node":"tipos","port":"out"},"to":{"node":"con_venta","port":"in"}},{"id":"con_venta_out__n1_in","from":{"node":"con_venta","port":"out"},"to":{"node":"n1","port":"in"}},{"id":"n1_out__faltante_in","from":{"node":"n1","port":"out"},"to":{"node":"faltante","port":"in"}},{"id":"faltante_out__urgentes_in","from":{"node":"faltante","port":"out"},"to":{"node":"urgentes","port":"in"}},{"id":"urgentes_out__tabla_reorden_in","from":{"node":"urgentes","port":"out"},"to":{"node":"tabla_reorden","port":"in"}}]}$flow$::jsonb,
  $manifest${"id":"hub.pymes.punto-reorden","version":"0.1.0","name":"Punto de Reorden con Stock de Seguridad","description":"Módulo compuesto para logística pyme: calcula el ROP = (Demanda Diaria * Lead Time) + Stock Seguridad para anticipar compras colectivas sin quiebres.","category":"Ventas & Pymes / Logística","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"nivel_servicio_z":{"type":"number","default":1.65}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"p_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"p_calc","type":"hub.pymes.calc-rop","version":"0.1.0","params":{"z":1.65},"position":{"x":260,"y":0},"label":"Cálculo ROP"},{"id":"p_alerta","type":"core.filter","version":"0.1.0","params":{"column":"stock_actual","op":"<=","value":"rop"},"position":{"x":520,"y":0},"label":"Necesita Reorden"},{"id":"p_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":780,"y":0}}],"edges":[{"id":"p_in_out__p_calc_in","from":{"node":"p_in","port":"out"},"to":{"node":"p_calc","port":"in"}},{"id":"p_calc_out__p_alerta_in","from":{"node":"p_calc","port":"out"},"to":{"node":"p_alerta","port":"in"}},{"id":"p_alerta_out__p_out_in","from":{"node":"p_alerta","port":"out"},"to":{"node":"p_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for validador-margen-neto-iva v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000012',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Validador de Margen Neto con IVA Demo","nodes":[{"id":"n1","type":"hub.pymes.margen-neto-iva","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.pymes.margen-neto-iva","version":"0.1.0","name":"Validador de Margen Neto con IVA Descontado","description":"Calcula el precio neto sin IVA (19% Chile / 16% México), descuenta fletes y verifica margen comercial neto evitando vender bajo costo de reposición.","category":"Ventas & Pymes / Precios","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"tasa_iva":{"type":"number","default":0.19},"margen_minimo_pct":{"type":"number","default":20}}},"impl":{"kind":"sql","template":"SELECT sku, producto, precio_bruto, ROUND(precio_bruto / (1.0 + {{tasa_iva}}), 2) AS precio_neto, costo_reposicion, ROUND((precio_bruto / (1.0 + {{tasa_iva}})) - costo_reposicion, 2) AS margen_pesos, ROUND((((precio_bruto / (1.0 + {{tasa_iva}})) - costo_reposicion) / (precio_bruto / (1.0 + {{tasa_iva}}))) * 100, 1) AS margen_pct FROM {{in}};"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for observatorio-calidad-aire-sinca v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000013',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Observatorio Comunal de Calidad del Aire","nodes":[{"id":"feed_sinca","type":"core.source.csv","version":"0.1.0","params":{"path":"sinca_chile_estaciones.csv"},"position":{"x":0,"y":0},"label":"Red SINCA Chile"},{"id":"indexador_h3","type":"hub.datos.indexador-h3","version":"0.1.0","params":{"resolucion":8},"position":{"x":780,"y":0},"label":"Malla Uber H3"},{"id":"calor_urbano","type":"hub.datos.calor-urbano","version":"0.1.0","params":{},"position":{"x":1040,"y":0},"label":"Índice Calor Urbano"},{"id":"mapa_riesgo","type":"core.view.bar","version":"0.1.0","params":{"x":"comuna","y":"mp25_ug_m3","title":"MP2.5 por Comuna"},"position":{"x":1560,"y":0},"label":"Exposición Comunal"},{"id":"censo_manzanas","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://datos-abiertos/censo-h3.csv"},"position":{"x":0,"y":150},"label":"Población del Censo"},{"id":"unir_censo","type":"core.join","version":"0.1.0","params":{"leftColumn":"h3_res8","rightColumn":"h3_res8","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir mediciones con población"},{"id":"tipos_sinca","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"mp25_ug_m3","to":"number"},{"column":"mp10_ug_m3","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar mediciones"},{"id":"exceso_norma","type":"core.formula","version":"0.1.0","params":{"name":"veces_norma","column":"mp25_ug_m3","op":"/","value":50},"position":{"x":1300,"y":0},"label":"Veces sobre la norma MP2,5"},{"id":"zonas_criticas","type":"core.filter","version":"0.1.0","params":{"column":"veces_norma","op":">","value":"1"},"position":{"x":1560,"y":150},"label":"Zonas sobre la norma"},{"id":"por_comuna","type":"core.group","version":"0.1.0","params":{"groupBy":["comuna"],"aggregations":[{"column":"mp25_ug_m3","fn":"AVG","name":"mp25_prom"},{"column":"poblacion_vulnerable_censo","fn":"SUM","name":"personas_expuestas"}]},"position":{"x":1560,"y":300},"label":"Resumen por comuna"},{"id":"comunas_expuestas","type":"core.sort","version":"0.1.0","params":{"column":"personas_expuestas","direction":"DESC"},"position":{"x":1820,"y":0},"label":"Comunas más expuestas"},{"id":"tabla_hexagonos","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":150},"label":"Hexágonos críticos"},{"id":"mp25_por_estacion","type":"core.view.bar","version":"0.1.0","params":{"x":"estacion_sinca","y":"mp25_ug_m3","title":"MP2,5 por estación"},"position":{"x":1560,"y":450},"label":"MP2,5 por estación"}],"edges":[{"id":"feed_sinca_out__unir_censo_left","from":{"node":"feed_sinca","port":"out"},"to":{"node":"unir_censo","port":"left"}},{"id":"censo_manzanas_out__unir_censo_right","from":{"node":"censo_manzanas","port":"out"},"to":{"node":"unir_censo","port":"right"}},{"id":"unir_censo_out__tipos_sinca_in","from":{"node":"unir_censo","port":"out"},"to":{"node":"tipos_sinca","port":"in"}},{"id":"tipos_sinca_out__indexador_h3_in","from":{"node":"tipos_sinca","port":"out"},"to":{"node":"indexador_h3","port":"in"}},{"id":"indexador_h3_out__calor_urbano_in","from":{"node":"indexador_h3","port":"out"},"to":{"node":"calor_urbano","port":"in"}},{"id":"calor_urbano_out__exceso_norma_in","from":{"node":"calor_urbano","port":"out"},"to":{"node":"exceso_norma","port":"in"}},{"id":"exceso_norma_out__mapa_riesgo_in","from":{"node":"exceso_norma","port":"out"},"to":{"node":"mapa_riesgo","port":"in"}},{"id":"exceso_norma_out__mp25_por_estacion_in","from":{"node":"exceso_norma","port":"out"},"to":{"node":"mp25_por_estacion","port":"in"}},{"id":"exceso_norma_out__zonas_criticas_in","from":{"node":"exceso_norma","port":"out"},"to":{"node":"zonas_criticas","port":"in"}},{"id":"zonas_criticas_out__tabla_hexagonos_in","from":{"node":"zonas_criticas","port":"out"},"to":{"node":"tabla_hexagonos","port":"in"}},{"id":"exceso_norma_out__por_comuna_in","from":{"node":"exceso_norma","port":"out"},"to":{"node":"por_comuna","port":"in"}},{"id":"por_comuna_out__comunas_expuestas_in","from":{"node":"por_comuna","port":"out"},"to":{"node":"comunas_expuestas","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for indexador-hexagonal-h3 v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000014',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Indexador H3 Demo","nodes":[{"id":"n1","type":"hub.datos.indexador-h3","version":"0.1.0","params":{},"position":{"x":780,"y":0}},{"id":"puntos","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://datos/puntos.csv"},"position":{"x":0,"y":0},"label":"Puntos con coordenadas"},{"id":"tipos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"lat","to":"number"},{"column":"lon","to":"number"}]},"position":{"x":260,"y":0},"label":"Normalizar coordenadas"},{"id":"en_area","type":"core.filter","version":"0.1.0","params":{"column":"lat","op":"<","value":"-17"},"position":{"x":520,"y":0},"label":"Dentro del área de estudio"},{"id":"por_hexagono","type":"core.sort","version":"0.1.0","params":{"column":"h3_res8","direction":"ASC"},"position":{"x":1040,"y":0},"label":"Agrupados por hexágono"},{"id":"tabla_h3","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":0},"label":"Puntos con su hexágono"}],"edges":[{"id":"puntos_out__tipos_in","from":{"node":"puntos","port":"out"},"to":{"node":"tipos","port":"in"}},{"id":"tipos_out__en_area_in","from":{"node":"tipos","port":"out"},"to":{"node":"en_area","port":"in"}},{"id":"en_area_out__n1_in","from":{"node":"en_area","port":"out"},"to":{"node":"n1","port":"in"}},{"id":"n1_out__por_hexagono_in","from":{"node":"n1","port":"out"},"to":{"node":"por_hexagono","port":"in"}},{"id":"por_hexagono_out__tabla_h3_in","from":{"node":"por_hexagono","port":"out"},"to":{"node":"tabla_h3","port":"in"}}]}$flow$::jsonb,
  $manifest${"id":"hub.datos.indexador-h3","version":"0.1.0","name":"Indexador Hexagonal Uber H3","description":"Módulo compuesto que mapea coordenadas geográficas (lat, lng) a identificadores de celdas hexagonales Uber H3 a resoluciones 7, 8 o 9.","category":"Datos Públicos / Geoespacial","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"resolucion":{"type":"integer","enum":[7,8,9],"default":8}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"h_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"h_index","type":"hub.datos.h3-geo-to-h3","version":"0.1.0","params":{"res":8},"position":{"x":260,"y":0},"label":"Indexador H3"},{"id":"h_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":520,"y":0}}],"edges":[{"id":"h_in_out__h_index_in","from":{"node":"h_in","port":"out"},"to":{"node":"h_index","port":"in"}},{"id":"h_index_out__h_out_in","from":{"node":"h_index","port":"out"},"to":{"node":"h_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for indice-calor-urbano-normalizado v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000015',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Índice de Calor Urbano Demo","nodes":[{"id":"n1","type":"hub.datos.calor-urbano","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.datos.calor-urbano","version":"0.1.0","name":"Índice de Calor Urbano Normalizado","description":"Calcula el Urban Heat Island Index (0 a 1) combinando temperatura superficial LST, cobertura vegetal NDVI y densidad edificada para priorizar arborización.","category":"Datos Públicos / Clima Urbano","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"peso_lst":{"type":"number","default":0.6},"peso_ndvi":{"type":"number","default":0.4}}},"impl":{"kind":"python","entry":"calculate_uhi_index","code":"def calculate_uhi_index(hexagons, params):\n    w_lst = params.get(\"peso_lst\", 0.6)\n    w_ndvi = params.get(\"peso_ndvi\", 0.4)\n    for h in hexagons:\n        lst = h.get(\"temp_superficial_c\", 25.0)\n        ndvi = h.get(\"ndvi\", 0.2)\n        uhi = (lst / 45.0) * w_lst + (1.0 - max(0.0, ndvi)) * w_ndvi\n        h[\"indice_calor_urbano\"] = round(min(1.0, max(0.0, uhi)), 3)\n    return hexagons"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for centinela-flujo-caja v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000016',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Centinela de Flujo de Caja y Cobranza Preventiva","nodes":[{"id":"facturas_sii","type":"core.source.csv","version":"0.1.0","params":{"path":"facturas_emitidas_dte.csv"},"position":{"x":0,"y":0},"label":"DTEs Emitidos"},{"id":"scoring_cartera","type":"hub.finanzas.scoring-cumplimiento","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Scoring de Cumplimiento"},{"id":"liquidacion_intereses","type":"hub.finanzas.interes-penal","version":"0.1.0","params":{"tasa_anual_pct":28.5},"position":{"x":1040,"y":0},"label":"Intereses Penales"},{"id":"curva_liquidez","type":"core.view.bar","version":"0.1.0","params":{"x":"razon_social","y":"total_exigible","title":"Recuperación por Cliente"},"position":{"x":1300,"y":0},"label":"Gráfico Exigible"},{"id":"pagos_banco","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://finanzas/cartola.csv"},"position":{"x":0,"y":150},"label":"Pagos recibidos (cartola)"},{"id":"conciliar_pagos","type":"core.join","version":"0.1.0","params":{"leftColumn":"folio_dte","rightColumn":"folio_dte","how":"LEFT"},"position":{"x":260,"y":0},"label":"Conciliar facturas y pagos"},{"id":"tipos_dte","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"monto_insoluto","to":"number"},{"column":"dias_atraso","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar montos y fechas"},{"id":"solo_vencidas","type":"core.filter","version":"0.1.0","params":{"column":"dias_atraso","op":">","value":"0"},"position":{"x":1300,"y":150},"label":"Solo facturas vencidas"},{"id":"por_cliente","type":"core.group","version":"0.1.0","params":{"groupBy":["rut_cliente","razon_social"],"aggregations":[{"column":"total_exigible","fn":"SUM","name":"deuda_total"},{"column":"dias_atraso","fn":"MAX","name":"atraso_max"}]},"position":{"x":1560,"y":0},"label":"Deuda por cliente"},{"id":"prioridad_cobro","type":"core.sort","version":"0.1.0","params":{"column":"deuda_total","direction":"DESC"},"position":{"x":1820,"y":0},"label":"A quién cobrar primero"},{"id":"lista_cobranza","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":2080,"y":0},"label":"Lista de cobranza"},{"id":"proyeccion_caja","type":"core.view.line","version":"0.1.0","params":{"x":"dias_atraso","y":"total_exigible"},"position":{"x":1300,"y":300},"label":"Caja proyectada a 90 días"}],"edges":[{"id":"facturas_sii_out__conciliar_pagos_left","from":{"node":"facturas_sii","port":"out"},"to":{"node":"conciliar_pagos","port":"left"}},{"id":"pagos_banco_out__conciliar_pagos_right","from":{"node":"pagos_banco","port":"out"},"to":{"node":"conciliar_pagos","port":"right"}},{"id":"conciliar_pagos_out__tipos_dte_in","from":{"node":"conciliar_pagos","port":"out"},"to":{"node":"tipos_dte","port":"in"}},{"id":"tipos_dte_out__scoring_cartera_in","from":{"node":"tipos_dte","port":"out"},"to":{"node":"scoring_cartera","port":"in"}},{"id":"scoring_cartera_out__liquidacion_intereses_in","from":{"node":"scoring_cartera","port":"out"},"to":{"node":"liquidacion_intereses","port":"in"}},{"id":"liquidacion_intereses_out__curva_liquidez_in","from":{"node":"liquidacion_intereses","port":"out"},"to":{"node":"curva_liquidez","port":"in"}},{"id":"liquidacion_intereses_out__proyeccion_caja_in","from":{"node":"liquidacion_intereses","port":"out"},"to":{"node":"proyeccion_caja","port":"in"}},{"id":"liquidacion_intereses_out__solo_vencidas_in","from":{"node":"liquidacion_intereses","port":"out"},"to":{"node":"solo_vencidas","port":"in"}},{"id":"solo_vencidas_out__por_cliente_in","from":{"node":"solo_vencidas","port":"out"},"to":{"node":"por_cliente","port":"in"}},{"id":"por_cliente_out__prioridad_cobro_in","from":{"node":"por_cliente","port":"out"},"to":{"node":"prioridad_cobro","port":"in"}},{"id":"prioridad_cobro_out__lista_cobranza_in","from":{"node":"prioridad_cobro","port":"out"},"to":{"node":"lista_cobranza","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for scoring-cumplimiento-clientes v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000017',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Scoring de Cumplimiento Demo","nodes":[{"id":"n1","type":"hub.finanzas.scoring-cumplimiento","version":"0.1.0","params":{},"position":{"x":780,"y":0}},{"id":"historial","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://finanzas/historial.csv"},"position":{"x":0,"y":0},"label":"Historial de pagos"},{"id":"tipos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"dias_atraso","to":"number"},{"column":"monto","to":"number"}]},"position":{"x":260,"y":0},"label":"Normalizar días y montos"},{"id":"con_historial","type":"core.filter","version":"0.1.0","params":{"column":"monto","op":">","value":"0"},"position":{"x":520,"y":0},"label":"Clientes con facturas"},{"id":"peor_puntaje","type":"core.sort","version":"0.1.0","params":{"column":"score_cumplimiento","direction":"ASC"},"position":{"x":1040,"y":0},"label":"Peor puntaje primero"},{"id":"tabla_scoring","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":0},"label":"Puntaje por cliente"}],"edges":[{"id":"historial_out__tipos_in","from":{"node":"historial","port":"out"},"to":{"node":"tipos","port":"in"}},{"id":"tipos_out__con_historial_in","from":{"node":"tipos","port":"out"},"to":{"node":"con_historial","port":"in"}},{"id":"con_historial_out__n1_in","from":{"node":"con_historial","port":"out"},"to":{"node":"n1","port":"in"}},{"id":"n1_out__peor_puntaje_in","from":{"node":"n1","port":"out"},"to":{"node":"peor_puntaje","port":"in"}},{"id":"peor_puntaje_out__tabla_scoring_in","from":{"node":"peor_puntaje","port":"out"},"to":{"node":"tabla_scoring","port":"in"}}]}$flow$::jsonb,
  $manifest${"id":"hub.finanzas.scoring-cumplimiento","version":"0.1.0","name":"Scoring de Cumplimiento de Clientes","description":"Módulo compuesto que clasifica pagadores según Days Sales Outstanding (DSO) y retraso histórico: Grado A (Puntual), B (Alerta Preventiva), C (Gestión Prejudicial).","category":"Finanzas / Riesgo","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"dias_tolerancia_b":{"type":"integer","default":15},"dias_critico_c":{"type":"integer","default":45}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"s_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"s_score","type":"hub.finanzas.dso-scoring","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Algoritmo DSO"},{"id":"s_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":520,"y":0}}],"edges":[{"id":"s_in_out__s_score_in","from":{"node":"s_in","port":"out"},"to":{"node":"s_score","port":"in"}},{"id":"s_score_out__s_out_in","from":{"node":"s_score","port":"out"},"to":{"node":"s_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for calculador-interes-penal-legal v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000018',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Interés Penal Legal Demo","nodes":[{"id":"n1","type":"hub.finanzas.interes-penal","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.finanzas.interes-penal","version":"0.1.0","name":"Calculador de Interés Penal Diario Legal","description":"Calcula intereses moratorios diarios legales bajo Ley N° 18.010 y Ley 21.131 (Pago a 30 días en Chile), aplicando la tasa máxima convencional diaria.","category":"Finanzas / Legal","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"tasa_anual_pct":{"type":"number","default":28.5},"columna_monto":{"type":"string","default":"monto_insoluto"},"columna_dias_mora":{"type":"string","default":"dias_atraso"}}},"impl":{"kind":"python","entry":"calcular_interes_mora","code":"def calcular_interes_mora(facturas, params):\n    tasa_diaria = (params.get(\"tasa_anual_pct\", 28.5) / 100.0) / 360.0\n    for f in facturas:\n        monto = f.get(\"monto_insoluto\", 0.0)\n        dias = max(0, f.get(\"dias_atraso\", 0))\n        interes = monto * tasa_diaria * dias\n        f[\"interes_penal_legal\"] = round(interes, 0)\n        f[\"total_exigible\"] = round(monto + interes, 0)\n    return facturas"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for predictor-generacion-solar v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000019',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Predictor Solar Fotovoltaico","nodes":[{"id":"datos_piranometro","type":"core.source.csv","version":"0.1.0","params":{"path":"atacama_sol.csv"},"position":{"x":0,"y":0},"label":"Piranómetro"},{"id":"calc_gti","type":"hub.energia.gti","version":"0.1.0","params":{"tilt_deg":22},"position":{"x":780,"y":0},"label":"Irradiancia GTI"},{"id":"grafico_mwh","type":"core.view.bar","version":"0.1.0","params":{"x":"hora","y":"mwh_producidos"},"position":{"x":1300,"y":0},"label":"Curva de Generación"},{"id":"ficha_planta","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://solar/planta.csv"},"position":{"x":0,"y":150},"label":"Ficha técnica de la planta"},{"id":"unir_planta","type":"core.join","version":"0.1.0","params":{"leftColumn":"planta_id","rightColumn":"planta_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir radiación con la planta"},{"id":"tipos_radiacion","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"fecha","to":"date-iso"},{"column":"ghi_w_m2","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar radiación"},{"id":"perdida_suciedad","type":"core.formula","version":"0.1.0","params":{"name":"mwh_neto","column":"mwh_bruto","op":"*","value":0.97},"position":{"x":1040,"y":0},"label":"Pérdida por suciedad"},{"id":"por_dia","type":"core.group","version":"0.1.0","params":{"groupBy":["fecha"],"aggregations":[{"column":"mwh_neto","fn":"SUM","name":"mwh_dia"}]},"position":{"x":1300,"y":150},"label":"Generación por día"},{"id":"peores_dias","type":"core.sort","version":"0.1.0","params":{"column":"mwh_dia","direction":"ASC"},"position":{"x":1560,"y":0},"label":"Días de menor generación"},{"id":"curva_generacion","type":"core.view.line","version":"0.1.0","params":{"x":"fecha","y":"mwh_neto"},"position":{"x":1300,"y":300},"label":"Generación diaria"},{"id":"tabla_dias","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":0},"label":"Días para revisar limpieza"}],"edges":[{"id":"datos_piranometro_out__unir_planta_left","from":{"node":"datos_piranometro","port":"out"},"to":{"node":"unir_planta","port":"left"}},{"id":"ficha_planta_out__unir_planta_right","from":{"node":"ficha_planta","port":"out"},"to":{"node":"unir_planta","port":"right"}},{"id":"unir_planta_out__tipos_radiacion_in","from":{"node":"unir_planta","port":"out"},"to":{"node":"tipos_radiacion","port":"in"}},{"id":"tipos_radiacion_out__calc_gti_in","from":{"node":"tipos_radiacion","port":"out"},"to":{"node":"calc_gti","port":"in"}},{"id":"calc_gti_out__perdida_suciedad_in","from":{"node":"calc_gti","port":"out"},"to":{"node":"perdida_suciedad","port":"in"}},{"id":"perdida_suciedad_out__grafico_mwh_in","from":{"node":"perdida_suciedad","port":"out"},"to":{"node":"grafico_mwh","port":"in"}},{"id":"perdida_suciedad_out__curva_generacion_in","from":{"node":"perdida_suciedad","port":"out"},"to":{"node":"curva_generacion","port":"in"}},{"id":"perdida_suciedad_out__por_dia_in","from":{"node":"perdida_suciedad","port":"out"},"to":{"node":"por_dia","port":"in"}},{"id":"por_dia_out__peores_dias_in","from":{"node":"por_dia","port":"out"},"to":{"node":"peores_dias","port":"in"}},{"id":"peores_dias_out__tabla_dias_in","from":{"node":"peores_dias","port":"out"},"to":{"node":"tabla_dias","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for espectro-diseno-sismico-nch433 v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000020',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Espectro Sísmico NCh433","nodes":[{"id":"parametros_suelo","type":"core.source.csv","version":"0.1.0","params":{"path":"suelo_zona.csv"},"position":{"x":0,"y":0},"label":"Suelo Tipo III / Zona 3"},{"id":"calculo_corte","type":"hub.estructuras.corte-basal","version":"0.1.0","params":{"r_factor":7},"position":{"x":780,"y":0},"label":"Cortante Basal"},{"id":"vista_espectro","type":"core.view.bar","version":"0.1.0","params":{"x":"periodo_t","y":"sa_aceleracion"},"position":{"x":1040,"y":0},"label":"Espectro Sa/g"},{"id":"pisos_edificio","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://estructuras/pisos.csv"},"position":{"x":0,"y":150},"label":"Pisos y pesos sísmicos"},{"id":"unir_pisos","type":"core.join","version":"0.1.0","params":{"leftColumn":"proyecto_id","rightColumn":"proyecto_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir suelo con el edificio"},{"id":"tipos_suelo","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"periodo_s","to":"number"},{"column":"peso_ton","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar parámetros"},{"id":"deriva","type":"core.formula","version":"0.1.0","params":{"name":"deriva","column":"desplazamiento_mm","op":"/","otherColumn":"altura_mm"},"position":{"x":1040,"y":150},"label":"Deriva de entrepiso"},{"id":"deriva_excedida","type":"core.filter","version":"0.1.0","params":{"column":"deriva","op":">","value":"0.002"},"position":{"x":1300,"y":0},"label":"Pisos sobre 0,002"},{"id":"espectro","type":"core.view.line","version":"0.1.0","params":{"x":"periodo_s","y":"sa_g"},"position":{"x":1040,"y":300},"label":"Espectro de aceleraciones"},{"id":"tabla_pisos","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":0},"label":"Pisos que no cumplen"}],"edges":[{"id":"parametros_suelo_out__unir_pisos_left","from":{"node":"parametros_suelo","port":"out"},"to":{"node":"unir_pisos","port":"left"}},{"id":"pisos_edificio_out__unir_pisos_right","from":{"node":"pisos_edificio","port":"out"},"to":{"node":"unir_pisos","port":"right"}},{"id":"unir_pisos_out__tipos_suelo_in","from":{"node":"unir_pisos","port":"out"},"to":{"node":"tipos_suelo","port":"in"}},{"id":"tipos_suelo_out__calculo_corte_in","from":{"node":"tipos_suelo","port":"out"},"to":{"node":"calculo_corte","port":"in"}},{"id":"calculo_corte_out__vista_espectro_in","from":{"node":"calculo_corte","port":"out"},"to":{"node":"vista_espectro","port":"in"}},{"id":"calculo_corte_out__espectro_in","from":{"node":"calculo_corte","port":"out"},"to":{"node":"espectro","port":"in"}},{"id":"calculo_corte_out__deriva_in","from":{"node":"calculo_corte","port":"out"},"to":{"node":"deriva","port":"in"}},{"id":"deriva_out__deriva_excedida_in","from":{"node":"deriva","port":"out"},"to":{"node":"deriva_excedida","port":"in"}},{"id":"deriva_excedida_out__tabla_pisos_in","from":{"node":"deriva_excedida","port":"out"},"to":{"node":"tabla_pisos","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for cuadre-caja-equilibrio-abarrotes v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000021',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Cuadre de Caja Abarrotes","nodes":[{"id":"caja_diaria","type":"core.source.csv","version":"0.1.0","params":{"path":"ventas_pos.csv"},"position":{"x":0,"y":0},"label":"Ventas Pos y Efectivo"},{"id":"resumen_caja","type":"core.view.bar","version":"0.1.0","params":{"x":"metodo_pago","y":"total"},"position":{"x":1300,"y":0},"label":"Cuadre"},{"id":"costos_fijos","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://almacen/costos.csv"},"position":{"x":0,"y":150},"label":"Arriendo, luz y sueldos"},{"id":"unir_costos","type":"core.join","version":"0.1.0","params":{"leftColumn":"mes","rightColumn":"mes","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir ventas con costos del mes"},{"id":"tipos_caja","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"fecha","to":"date-iso"},{"column":"efectivo","to":"number"},{"column":"tarjeta","to":"number"},{"column":"fiado","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar montos"},{"id":"venta_total","type":"core.formula","version":"0.1.0","params":{"name":"venta_total","column":"efectivo","op":"+","otherColumn":"tarjeta"},"position":{"x":780,"y":0},"label":"Venta del día"},{"id":"margen_dia","type":"core.formula","version":"0.1.0","params":{"name":"margen","column":"venta_total","op":"*","value":0.22},"position":{"x":1040,"y":0},"label":"Margen del día"},{"id":"por_mes","type":"core.group","version":"0.1.0","params":{"groupBy":["mes"],"aggregations":[{"column":"venta_total","fn":"SUM","name":"ventas_mes"},{"column":"margen","fn":"SUM","name":"margen_mes"},{"column":"fiado","fn":"SUM","name":"fiado_mes"}]},"position":{"x":1300,"y":150},"label":"Resumen del mes"},{"id":"ventas_diarias","type":"core.view.line","version":"0.1.0","params":{"x":"fecha","y":"venta_total"},"position":{"x":1300,"y":300},"label":"Ventas día a día"},{"id":"tabla_equilibrio","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":0},"label":"¿Se cubren los costos?"}],"edges":[{"id":"caja_diaria_out__unir_costos_left","from":{"node":"caja_diaria","port":"out"},"to":{"node":"unir_costos","port":"left"}},{"id":"costos_fijos_out__unir_costos_right","from":{"node":"costos_fijos","port":"out"},"to":{"node":"unir_costos","port":"right"}},{"id":"unir_costos_out__tipos_caja_in","from":{"node":"unir_costos","port":"out"},"to":{"node":"tipos_caja","port":"in"}},{"id":"tipos_caja_out__venta_total_in","from":{"node":"tipos_caja","port":"out"},"to":{"node":"venta_total","port":"in"}},{"id":"venta_total_out__margen_dia_in","from":{"node":"venta_total","port":"out"},"to":{"node":"margen_dia","port":"in"}},{"id":"margen_dia_out__resumen_caja_in","from":{"node":"margen_dia","port":"out"},"to":{"node":"resumen_caja","port":"in"}},{"id":"margen_dia_out__ventas_diarias_in","from":{"node":"margen_dia","port":"out"},"to":{"node":"ventas_diarias","port":"in"}},{"id":"margen_dia_out__por_mes_in","from":{"node":"margen_dia","port":"out"},"to":{"node":"por_mes","port":"in"}},{"id":"por_mes_out__tabla_equilibrio_in","from":{"node":"por_mes","port":"out"},"to":{"node":"tabla_equilibrio","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for control-insumos-box-dental v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000022',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Control Box Dental","nodes":[{"id":"insumos_box","type":"core.source.csv","version":"0.1.0","params":{"path":"inventario_dental.csv"},"position":{"x":0,"y":0},"label":"Stock Box"},{"id":"filtro_caducidad","type":"core.filter","version":"0.1.0","params":{"column":"dias_para_vencer","op":"<=","value":"30"},"position":{"x":780,"y":0},"label":"Próximos a Vencer"},{"id":"registro_autoclave","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://dental/autoclave.csv"},"position":{"x":0,"y":150},"label":"Registro del autoclave"},{"id":"unir_lotes","type":"core.join","version":"0.1.0","params":{"leftColumn":"lote","rightColumn":"lote","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir insumos con su lote"},{"id":"tipos_insumo","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"vencimiento","to":"date-iso"},{"column":"stock","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar fechas"},{"id":"bajo_minimo","type":"core.filter","version":"0.1.0","params":{"column":"stock","op":"<","value":"5"},"position":{"x":780,"y":150},"label":"Bajo el stock mínimo"},{"id":"por_categoria","type":"core.group","version":"0.1.0","params":{"groupBy":["categoria"],"aggregations":[{"column":"stock","fn":"SUM","name":"unidades"}]},"position":{"x":780,"y":300},"label":"Stock por categoría"},{"id":"stock_categoria","type":"core.view.bar","version":"0.1.0","params":{"x":"categoria","y":"unidades","title":"Unidades por categoría"},"position":{"x":1040,"y":0},"label":"Unidades por categoría"},{"id":"por_vencer","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1040,"y":150},"label":"Insumos por vencer"},{"id":"pedido","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1040,"y":300},"label":"Pedido al proveedor"}],"edges":[{"id":"insumos_box_out__unir_lotes_left","from":{"node":"insumos_box","port":"out"},"to":{"node":"unir_lotes","port":"left"}},{"id":"registro_autoclave_out__unir_lotes_right","from":{"node":"registro_autoclave","port":"out"},"to":{"node":"unir_lotes","port":"right"}},{"id":"unir_lotes_out__tipos_insumo_in","from":{"node":"unir_lotes","port":"out"},"to":{"node":"tipos_insumo","port":"in"}},{"id":"tipos_insumo_out__filtro_caducidad_in","from":{"node":"tipos_insumo","port":"out"},"to":{"node":"filtro_caducidad","port":"in"}},{"id":"filtro_caducidad_out__por_vencer_in","from":{"node":"filtro_caducidad","port":"out"},"to":{"node":"por_vencer","port":"in"}},{"id":"tipos_insumo_out__bajo_minimo_in","from":{"node":"tipos_insumo","port":"out"},"to":{"node":"bajo_minimo","port":"in"}},{"id":"bajo_minimo_out__pedido_in","from":{"node":"bajo_minimo","port":"out"},"to":{"node":"pedido","port":"in"}},{"id":"tipos_insumo_out__por_categoria_in","from":{"node":"tipos_insumo","port":"out"},"to":{"node":"por_categoria","port":"in"}},{"id":"por_categoria_out__stock_categoria_in","from":{"node":"por_categoria","port":"out"},"to":{"node":"stock_categoria","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for control-rebao-curva-lactancia v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000023',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Curva de Lactancia Lechera","nodes":[{"id":"control_lechero","type":"core.source.csv","version":"0.1.0","params":{"path":"sala_ordena.csv"},"position":{"x":0,"y":0},"label":"Sala de Ordeña"},{"id":"alerta_mastitis","type":"core.filter","version":"0.1.0","params":{"column":"celulas_somaticas","op":">","value":"250000"},"position":{"x":1040,"y":0},"label":"Alerta Mastitis"},{"id":"ficha_vacas","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://lecheria/vacas.csv"},"position":{"x":0,"y":150},"label":"Ficha de cada vaca"},{"id":"unir_ficha","type":"core.join","version":"0.1.0","params":{"leftColumn":"vaca_id","rightColumn":"vaca_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir control con ficha"},{"id":"tipos_control","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"fecha","to":"date-iso"},{"column":"litros","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar litros"},{"id":"caida","type":"core.formula","version":"0.1.0","params":{"name":"caida_pct","column":"litros","op":"/","otherColumn":"litros_esperados"},"position":{"x":780,"y":0},"label":"Caída frente a lo esperado"},{"id":"por_lote","type":"core.group","version":"0.1.0","params":{"groupBy":["lote"],"aggregations":[{"column":"litros","fn":"SUM","name":"litros_lote"}]},"position":{"x":1040,"y":150},"label":"Producción por lote"},{"id":"curva_lactancia","type":"core.view.line","version":"0.1.0","params":{"x":"dias_lactancia","y":"litros","series":"vaca_id"},"position":{"x":1040,"y":300},"label":"Curva de lactancia"},{"id":"vacas_alerta","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":0},"label":"Vacas para revisar"},{"id":"litros_por_lote","type":"core.view.bar","version":"0.1.0","params":{"x":"lote","y":"litros_lote","title":"Litros por lote"},"position":{"x":1300,"y":150},"label":"Litros por lote"}],"edges":[{"id":"control_lechero_out__unir_ficha_left","from":{"node":"control_lechero","port":"out"},"to":{"node":"unir_ficha","port":"left"}},{"id":"ficha_vacas_out__unir_ficha_right","from":{"node":"ficha_vacas","port":"out"},"to":{"node":"unir_ficha","port":"right"}},{"id":"unir_ficha_out__tipos_control_in","from":{"node":"unir_ficha","port":"out"},"to":{"node":"tipos_control","port":"in"}},{"id":"tipos_control_out__caida_in","from":{"node":"tipos_control","port":"out"},"to":{"node":"caida","port":"in"}},{"id":"caida_out__alerta_mastitis_in","from":{"node":"caida","port":"out"},"to":{"node":"alerta_mastitis","port":"in"}},{"id":"alerta_mastitis_out__vacas_alerta_in","from":{"node":"alerta_mastitis","port":"out"},"to":{"node":"vacas_alerta","port":"in"}},{"id":"caida_out__curva_lactancia_in","from":{"node":"caida","port":"out"},"to":{"node":"curva_lactancia","port":"in"}},{"id":"caida_out__por_lote_in","from":{"node":"caida","port":"out"},"to":{"node":"por_lote","port":"in"}},{"id":"por_lote_out__litros_por_lote_in","from":{"node":"por_lote","port":"out"},"to":{"node":"litros_por_lote","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for matriz-abc-inventario-ferretero v1.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000024',
  '1.1.0',
  $flow${"format":"nodomics/flow@0","name":"Matriz ABC Ferretera","nodes":[{"id":"articulos_sku","type":"core.source.csv","version":"0.1.0","params":{"path":"catalogo_ferretero.csv"},"position":{"x":0,"y":0},"label":"Catálogo 8000 SKUs"},{"id":"filtro_clase_a","type":"core.filter","version":"0.1.0","params":{"column":"clase_abc","op":"=","value":"A"},"position":{"x":1040,"y":0},"label":"Artículos Clase A"},{"id":"ventas_anuales","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://ferreteria/ventas.csv"},"position":{"x":0,"y":150},"label":"Ventas del año"},{"id":"unir_ventas","type":"core.join","version":"0.1.0","params":{"leftColumn":"sku","rightColumn":"sku","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir artículos con ventas"},{"id":"tipos_sku","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"monto_vendido","to":"number"},{"column":"stock","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar montos"},{"id":"por_monto","type":"core.sort","version":"0.1.0","params":{"column":"monto_vendido","direction":"DESC"},"position":{"x":780,"y":0},"label":"Ordenar por monto vendido"},{"id":"por_clase","type":"core.group","version":"0.1.0","params":{"groupBy":["clase_abc"],"aggregations":[{"column":"monto_vendido","fn":"SUM","name":"monto"},{"column":"sku","fn":"COUNT","name":"articulos"}]},"position":{"x":1040,"y":150},"label":"Resumen por clase"},{"id":"dias_stock","type":"core.formula","version":"0.1.0","params":{"name":"dias_stock","column":"stock","op":"/","otherColumn":"venta_diaria"},"position":{"x":1300,"y":0},"label":"Días de inventario"},{"id":"monto_por_clase","type":"core.view.bar","version":"0.1.0","params":{"x":"clase_abc","y":"monto","title":"Monto por clase"},"position":{"x":1300,"y":150},"label":"Monto por clase"},{"id":"reposicion","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":0},"label":"Reposición quincenal"}],"edges":[{"id":"articulos_sku_out__unir_ventas_left","from":{"node":"articulos_sku","port":"out"},"to":{"node":"unir_ventas","port":"left"}},{"id":"ventas_anuales_out__unir_ventas_right","from":{"node":"ventas_anuales","port":"out"},"to":{"node":"unir_ventas","port":"right"}},{"id":"unir_ventas_out__tipos_sku_in","from":{"node":"unir_ventas","port":"out"},"to":{"node":"tipos_sku","port":"in"}},{"id":"tipos_sku_out__por_monto_in","from":{"node":"tipos_sku","port":"out"},"to":{"node":"por_monto","port":"in"}},{"id":"por_monto_out__por_clase_in","from":{"node":"por_monto","port":"out"},"to":{"node":"por_clase","port":"in"}},{"id":"por_clase_out__monto_por_clase_in","from":{"node":"por_clase","port":"out"},"to":{"node":"monto_por_clase","port":"in"}},{"id":"por_monto_out__filtro_clase_a_in","from":{"node":"por_monto","port":"out"},"to":{"node":"filtro_clase_a","port":"in"}},{"id":"filtro_clase_a_out__dias_stock_in","from":{"node":"filtro_clase_a","port":"out"},"to":{"node":"dias_stock","port":"in"}},{"id":"dias_stock_out__reposicion_in","from":{"node":"dias_stock","port":"out"},"to":{"node":"reposicion","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for controles-cronicos-atrasados v1.3.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000025',
  '1.3.0',
  $flow${"format":"nodomics/flow@0","name":"Controles Crónicos Atrasados","nodes":[{"id":"farmacia_retiros","type":"core.source.csv","version":"0.1.0","params":{"path":"farmacia_padrelascasas.csv"},"position":{"x":0,"y":0},"label":"Farmacia CESFAM"},{"id":"agenda_medica","type":"core.source.csv","version":"0.1.0","params":{"path":"agenda_medica.csv"},"position":{"x":0,"y":150},"label":"Agenda Médica"},{"id":"filtro_inasistentes","type":"core.filter","version":"0.1.0","params":{"column":"dias_sin_control","op":">","value":"180"},"position":{"x":1040,"y":0},"label":"Más de 6 Meses"},{"id":"alerta_pacientes","type":"core.view.bar","version":"0.1.0","params":{"x":"sector_cesfam","y":"total_pacientes"},"position":{"x":1300,"y":0},"label":"Pacientes por Sector"},{"id":"cruce_rut","type":"core.join","version":"0.1.0","params":{"leftColumn":"rut_paciente","rightColumn":"rut_paciente","how":"LEFT"},"position":{"x":260,"y":0},"label":"Cruzar farmacia y agenda por RUT"},{"id":"tipos_fechas","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"ultimo_control","to":"date-iso"},{"column":"ultimo_retiro","to":"date-iso"}]},"position":{"x":520,"y":0},"label":"Normalizar fechas"},{"id":"meses_sin_control","type":"core.formula","version":"0.1.0","params":{"name":"meses_sin_control","column":"dias_sin_control","op":"/","value":30},"position":{"x":780,"y":0},"label":"Meses sin control"},{"id":"por_sector","type":"core.group","version":"0.1.0","params":{"groupBy":["sector"],"aggregations":[{"column":"rut_paciente","fn":"COUNT","name":"pacientes"}]},"position":{"x":1300,"y":150},"label":"Pacientes por sector"},{"id":"sectores_criticos","type":"core.sort","version":"0.1.0","params":{"column":"pacientes","direction":"DESC"},"position":{"x":1560,"y":0},"label":"Sectores con más atrasos"},{"id":"lista_contacto","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":300},"label":"Lista para llamar"}],"edges":[{"id":"farmacia_retiros_out__cruce_rut_left","from":{"node":"farmacia_retiros","port":"out"},"to":{"node":"cruce_rut","port":"left"}},{"id":"agenda_medica_out__cruce_rut_right","from":{"node":"agenda_medica","port":"out"},"to":{"node":"cruce_rut","port":"right"}},{"id":"cruce_rut_out__tipos_fechas_in","from":{"node":"cruce_rut","port":"out"},"to":{"node":"tipos_fechas","port":"in"}},{"id":"tipos_fechas_out__meses_sin_control_in","from":{"node":"tipos_fechas","port":"out"},"to":{"node":"meses_sin_control","port":"in"}},{"id":"meses_sin_control_out__filtro_inasistentes_in","from":{"node":"meses_sin_control","port":"out"},"to":{"node":"filtro_inasistentes","port":"in"}},{"id":"filtro_inasistentes_out__alerta_pacientes_in","from":{"node":"filtro_inasistentes","port":"out"},"to":{"node":"alerta_pacientes","port":"in"}},{"id":"filtro_inasistentes_out__lista_contacto_in","from":{"node":"filtro_inasistentes","port":"out"},"to":{"node":"lista_contacto","port":"in"}},{"id":"filtro_inasistentes_out__por_sector_in","from":{"node":"filtro_inasistentes","port":"out"},"to":{"node":"por_sector","port":"in"}},{"id":"por_sector_out__sectores_criticos_in","from":{"node":"por_sector","port":"out"},"to":{"node":"sectores_criticos","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for limpieza-censo-comunal v2.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000026',
  '2.1.0',
  $flow${"format":"nodomics/flow@0","name":"Limpieza del Censo Comunal","nodes":[{"id":"direcciones_brutas","type":"core.source.csv","version":"0.1.0","params":{"path":"catastro_coquimbo.csv"},"position":{"x":0,"y":0},"label":"Catastro Municipal"},{"id":"normalizador_rural","type":"core.filter","version":"0.1.0","params":{"column":"tipo_calle","op":"!=","value":"SIN_NUMERO"},"position":{"x":780,"y":0},"label":"Empalme Rural"},{"id":"grilla_censal","type":"core.view.bar","version":"0.1.0","params":{"x":"distrito_censal","y":"viviendas_validadas"},"position":{"x":1300,"y":0},"label":"Grilla Censal"},{"id":"catastro_rural","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://municipio/catastro.csv"},"position":{"x":0,"y":150},"label":"Catastro de sectores rurales"},{"id":"unir_catastro","type":"core.join","version":"0.1.0","params":{"leftColumn":"sector","rightColumn":"sector","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir direcciones con catastro"},{"id":"tipos_direccion","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"numero","to":"text"},{"column":"sector","to":"text"}]},"position":{"x":520,"y":0},"label":"Normalizar textos"},{"id":"sin_ubicar","type":"core.filter","version":"0.1.0","params":{"column":"manzana_id","op":"=","value":""},"position":{"x":1040,"y":0},"label":"Direcciones sin manzana"},{"id":"por_grilla","type":"core.group","version":"0.1.0","params":{"groupBy":["grilla_id"],"aggregations":[{"column":"direccion","fn":"COUNT","name":"viviendas"}]},"position":{"x":1040,"y":150},"label":"Viviendas por grilla"},{"id":"para_revisar","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":150},"label":"Direcciones para revisar a mano"}],"edges":[{"id":"direcciones_brutas_out__unir_catastro_left","from":{"node":"direcciones_brutas","port":"out"},"to":{"node":"unir_catastro","port":"left"}},{"id":"catastro_rural_out__unir_catastro_right","from":{"node":"catastro_rural","port":"out"},"to":{"node":"unir_catastro","port":"right"}},{"id":"unir_catastro_out__tipos_direccion_in","from":{"node":"unir_catastro","port":"out"},"to":{"node":"tipos_direccion","port":"in"}},{"id":"tipos_direccion_out__normalizador_rural_in","from":{"node":"tipos_direccion","port":"out"},"to":{"node":"normalizador_rural","port":"in"}},{"id":"normalizador_rural_out__por_grilla_in","from":{"node":"normalizador_rural","port":"out"},"to":{"node":"por_grilla","port":"in"}},{"id":"por_grilla_out__grilla_censal_in","from":{"node":"por_grilla","port":"out"},"to":{"node":"grilla_censal","port":"in"}},{"id":"normalizador_rural_out__sin_ubicar_in","from":{"node":"normalizador_rural","port":"out"},"to":{"node":"sin_ubicar","port":"in"}},{"id":"sin_ubicar_out__para_revisar_in","from":{"node":"sin_ubicar","port":"out"},"to":{"node":"para_revisar","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for asistencia-escolar-curso v1.4.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000027',
  '1.4.0',
  $flow${"format":"nodomics/flow@0","name":"Asistencia Escolar por Curso","nodes":[{"id":"libro_asistencia","type":"core.source.csv","version":"0.1.0","params":{"path":"asistencia_ancud.csv"},"position":{"x":0,"y":0},"label":"Libro Digital"},{"id":"alerta_ausentismo","type":"core.filter","version":"0.1.0","params":{"column":"inasistencia_pct","op":">=","value":"15"},"position":{"x":1040,"y":0},"label":"Ausentismo Crónico"},{"id":"vista_cursos","type":"core.view.bar","version":"0.1.0","params":{"x":"curso","y":"alumnos_en_riesgo"},"position":{"x":1300,"y":0},"label":"Riesgo por Curso"},{"id":"clima_diario","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://clima/ancud.csv"},"position":{"x":0,"y":150},"label":"Lluvia diaria (DMC)"},{"id":"unir_clima","type":"core.join","version":"0.1.0","params":{"leftColumn":"fecha","rightColumn":"fecha","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir asistencia con lluvia"},{"id":"tipos_asistencia","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"fecha","to":"date-iso"},{"column":"presente","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar fechas"},{"id":"por_alumno","type":"core.group","version":"0.1.0","params":{"groupBy":["curso","alumno"],"aggregations":[{"column":"presente","fn":"AVG","name":"asistencia_pct"}]},"position":{"x":780,"y":0},"label":"Asistencia por alumno"},{"id":"asistencia_lluvia","type":"core.view.line","version":"0.1.0","params":{"x":"fecha","y":"presente","series":"curso"},"position":{"x":780,"y":150},"label":"Asistencia y lluvia"},{"id":"derivar_apoyo","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1300,"y":150},"label":"Alumnos para apoyo psicosocial"}],"edges":[{"id":"libro_asistencia_out__unir_clima_left","from":{"node":"libro_asistencia","port":"out"},"to":{"node":"unir_clima","port":"left"}},{"id":"clima_diario_out__unir_clima_right","from":{"node":"clima_diario","port":"out"},"to":{"node":"unir_clima","port":"right"}},{"id":"unir_clima_out__tipos_asistencia_in","from":{"node":"unir_clima","port":"out"},"to":{"node":"tipos_asistencia","port":"in"}},{"id":"tipos_asistencia_out__asistencia_lluvia_in","from":{"node":"tipos_asistencia","port":"out"},"to":{"node":"asistencia_lluvia","port":"in"}},{"id":"tipos_asistencia_out__por_alumno_in","from":{"node":"tipos_asistencia","port":"out"},"to":{"node":"por_alumno","port":"in"}},{"id":"por_alumno_out__alerta_ausentismo_in","from":{"node":"por_alumno","port":"out"},"to":{"node":"alerta_ausentismo","port":"in"}},{"id":"alerta_ausentismo_out__vista_cursos_in","from":{"node":"alerta_ausentismo","port":"out"},"to":{"node":"vista_cursos","port":"in"}},{"id":"alerta_ausentismo_out__derivar_apoyo_in","from":{"node":"alerta_ausentismo","port":"out"},"to":{"node":"derivar_apoyo","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for churn-mensual-suscriptores v1.2.0-conflict
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000028',
  '1.2.0-conflict',
  $flow${"format":"nodomics/flow@0","name":"Churn Mensual de Suscriptores","nodes":[{"id":"suscripciones_activas","type":"core.source.csv","version":"0.1.0","params":{"path":"suscripciones.csv"},"position":{"x":0,"y":0},"label":"Base Suscriptores"},{"id":"filtro_bajas","type":"core.filter","version":"0.1.0","params":{"column":"dias_sin_login","op":">=","value":"45"},"position":{"x":780,"y":0},"label":"Regla en Conflicto"},{"id":"vista_cohortes","type":"core.view.bar","version":"0.1.0","params":{"x":"cohorte","y":"tasa_churn"},"position":{"x":1300,"y":0},"label":"Cohortes"},{"id":"pagos","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://saas/pagos.csv"},"position":{"x":0,"y":150},"label":"Pagos por suscripción"},{"id":"unir_pagos","type":"core.join","version":"0.1.0","params":{"leftColumn":"suscripcion_id","rightColumn":"suscripcion_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir suscripciones con pagos"},{"id":"tipos_suscripcion","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"alta","to":"date-iso"},{"column":"baja","to":"date-iso"}]},"position":{"x":520,"y":0},"label":"Normalizar fechas"},{"id":"por_cohorte","type":"core.group","version":"0.1.0","params":{"groupBy":["cohorte"],"aggregations":[{"column":"suscripcion_id","fn":"COUNT","name":"bajas"},{"column":"mrr","fn":"SUM","name":"mrr_perdido"}]},"position":{"x":1040,"y":0},"label":"Bajas por cohorte"},{"id":"churn_mensual","type":"core.view.line","version":"0.1.0","params":{"x":"cohorte","y":"bajas"},"position":{"x":1300,"y":150},"label":"Churn mes a mes"},{"id":"clientes_riesgo","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1040,"y":150},"label":"Clientes en riesgo"}],"edges":[{"id":"suscripciones_activas_out__unir_pagos_left","from":{"node":"suscripciones_activas","port":"out"},"to":{"node":"unir_pagos","port":"left"}},{"id":"pagos_out__unir_pagos_right","from":{"node":"pagos","port":"out"},"to":{"node":"unir_pagos","port":"right"}},{"id":"unir_pagos_out__tipos_suscripcion_in","from":{"node":"unir_pagos","port":"out"},"to":{"node":"tipos_suscripcion","port":"in"}},{"id":"tipos_suscripcion_out__filtro_bajas_in","from":{"node":"tipos_suscripcion","port":"out"},"to":{"node":"filtro_bajas","port":"in"}},{"id":"filtro_bajas_out__por_cohorte_in","from":{"node":"filtro_bajas","port":"out"},"to":{"node":"por_cohorte","port":"in"}},{"id":"por_cohorte_out__vista_cohortes_in","from":{"node":"por_cohorte","port":"out"},"to":{"node":"vista_cohortes","port":"in"}},{"id":"por_cohorte_out__churn_mensual_in","from":{"node":"por_cohorte","port":"out"},"to":{"node":"churn_mensual","port":"in"}},{"id":"filtro_bajas_out__clientes_riesgo_in","from":{"node":"filtro_bajas","port":"out"},"to":{"node":"clientes_riesgo","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for quiebres-stock-bodega v1.1.0-broken
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000029',
  '1.1.0-broken',
  $flow${"format":"nodomics/flow@0","name":"Quiebres de Stock en Bodega","nodes":[{"id":"inventario_bodega","type":"core.source.csv","version":"0.1.0","params":{"path":"bodega_osorno.csv"},"position":{"x":0,"y":0},"label":"Stock Bodega"},{"id":"filtro_quiebre","type":"core.filter","version":"0.1.0","params":{"column":"dias_stock","op":"<=","value":"3"},"position":{"x":1040,"y":0},"label":"Fórmula Triza"},{"id":"alerta_compras","type":"core.view.bar","version":"0.1.0","params":{"x":"familia_producto","y":"quiebres"},"position":{"x":1300,"y":0},"label":"Quiebres"},{"id":"ventas_bodega","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://bodega/ventas.csv"},"position":{"x":0,"y":150},"label":"Ventas diarias"},{"id":"unir_ventas","type":"core.join","version":"0.1.0","params":{"leftColumn":"sku","rightColumn":"sku","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir inventario con ventas"},{"id":"tipos_inventario","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"stock","to":"number"},{"column":"venta_diaria","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar cantidades"},{"id":"dias_cobertura","type":"core.formula","version":"0.1.0","params":{"name":"dias_cobertura","column":"stock","op":"/","otherColumn":"venta_diaria"},"position":{"x":780,"y":0},"label":"Días de cobertura"},{"id":"menos_cobertura","type":"core.sort","version":"0.1.0","params":{"column":"dias_cobertura","direction":"ASC"},"position":{"x":1300,"y":150},"label":"Menos cobertura primero"},{"id":"pedido_urgente","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":0},"label":"Pedido urgente"}],"edges":[{"id":"inventario_bodega_out__unir_ventas_left","from":{"node":"inventario_bodega","port":"out"},"to":{"node":"unir_ventas","port":"left"}},{"id":"ventas_bodega_out__unir_ventas_right","from":{"node":"ventas_bodega","port":"out"},"to":{"node":"unir_ventas","port":"right"}},{"id":"unir_ventas_out__tipos_inventario_in","from":{"node":"unir_ventas","port":"out"},"to":{"node":"tipos_inventario","port":"in"}},{"id":"tipos_inventario_out__dias_cobertura_in","from":{"node":"tipos_inventario","port":"out"},"to":{"node":"dias_cobertura","port":"in"}},{"id":"dias_cobertura_out__filtro_quiebre_in","from":{"node":"dias_cobertura","port":"out"},"to":{"node":"filtro_quiebre","port":"in"}},{"id":"filtro_quiebre_out__alerta_compras_in","from":{"node":"filtro_quiebre","port":"out"},"to":{"node":"alerta_compras","port":"in"}},{"id":"filtro_quiebre_out__menos_cobertura_in","from":{"node":"filtro_quiebre","port":"out"},"to":{"node":"menos_cobertura","port":"in"}},{"id":"menos_cobertura_out__pedido_urgente_in","from":{"node":"menos_cobertura","port":"out"},"to":{"node":"pedido_urgente","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for normalizacion-qpcr v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000030',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Normalización de qPCR Demo","nodes":[{"id":"n1","type":"hub.laboratorio.normalizacion-qpcr","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.laboratorio.normalizacion-qpcr","version":"0.1.0","name":"Normalización de qPCR","description":"Nodo atómico que normaliza ciclos umbral (Cq) contra genes de referencia constitutivos (GAPDH/Actina) mediante método delta-delta-Cq de Livak.","category":"Laboratorio / Biología Molecular","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"gen_referencia":{"type":"string","default":"GAPDH"},"columna_cq":{"type":"string","default":"cq_valor"}},"required":["gen_referencia","columna_cq"]},"impl":{"kind":"python","entry":"normalizar_qpcr","code":"def normalizar_qpcr(muestras, params):\n    ref_gene = params.get(\"gen_referencia\", \"GAPDH\")\n    for m in muestras:\n        cq = m.get(\"cq_valor\", 0.0)\n        ref_cq = m.get(\"cq_referencia\", 20.0)\n        delta_cq = cq - ref_cq\n        m[\"delta_cq\"] = round(delta_cq, 2)\n        m[\"expresion_relativa\"] = round(2 ** (-delta_cq), 4)\n    return muestras"}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for arborizacion-global v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000031',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Mitigación de Islas de Calor Global","nodes":[{"id":"in","type":"core.source.csv","version":"0.1.0","params":{"path":"urban_grid.csv"},"position":{"x":0,"y":0},"label":"Capa Satelital Abierta"},{"id":"calc","type":"hub.global.arborizacion-urbana","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Índice Urgencia Térmica"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"urgencia_termica","op":">","value":"0.7"},"position":{"x":1300,"y":0},"label":"Corredor Verde Priorizado"},{"id":"poblacion_mayor","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://ciudad/poblacion.csv"},"position":{"x":0,"y":150},"label":"Adultos mayores por hexágono"},{"id":"unir_poblacion","type":"core.join","version":"0.1.0","params":{"leftColumn":"h3_id","rightColumn":"h3_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir temperatura con población"},{"id":"tipos_satelite","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"lst_c","to":"number"},{"column":"ndvi","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar temperatura"},{"id":"prioridad","type":"core.formula","version":"0.1.0","params":{"name":"prioridad","column":"lst_c","op":"*","otherColumn":"adultos_mayores"},"position":{"x":1040,"y":0},"label":"Prioridad de plantación"},{"id":"mas_prioritarias","type":"core.sort","version":"0.1.0","params":{"column":"prioridad","direction":"DESC"},"position":{"x":1560,"y":0},"label":"Calles más prioritarias"},{"id":"calor_por_barrio","type":"core.view.bar","version":"0.1.0","params":{"x":"barrio","y":"lst_c","title":"Temperatura por barrio"},"position":{"x":1300,"y":150},"label":"Temperatura por barrio"},{"id":"plan_plantacion","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":0},"label":"Plan de plantación"}],"edges":[{"id":"in_out__unir_poblacion_left","from":{"node":"in","port":"out"},"to":{"node":"unir_poblacion","port":"left"}},{"id":"poblacion_mayor_out__unir_poblacion_right","from":{"node":"poblacion_mayor","port":"out"},"to":{"node":"unir_poblacion","port":"right"}},{"id":"unir_poblacion_out__tipos_satelite_in","from":{"node":"unir_poblacion","port":"out"},"to":{"node":"tipos_satelite","port":"in"}},{"id":"tipos_satelite_out__calc_in","from":{"node":"tipos_satelite","port":"out"},"to":{"node":"calc","port":"in"}},{"id":"calc_out__prioridad_in","from":{"node":"calc","port":"out"},"to":{"node":"prioridad","port":"in"}},{"id":"prioridad_out__calor_por_barrio_in","from":{"node":"prioridad","port":"out"},"to":{"node":"calor_por_barrio","port":"in"}},{"id":"prioridad_out__out_in","from":{"node":"prioridad","port":"out"},"to":{"node":"out","port":"in"}},{"id":"out_out__mas_prioritarias_in","from":{"node":"out","port":"out"},"to":{"node":"mas_prioritarias","port":"in"}},{"id":"mas_prioritarias_out__plan_plantacion_in","from":{"node":"mas_prioritarias","port":"out"},"to":{"node":"plan_plantacion","port":"in"}}],"customNodes":[{"id":"hub.global.arborizacion-urbana","version":"0.1.0","name":"Mitigación de Islas de Calor y Corredores Verdes","category":"Urbanismo Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_calor_critico":{"type":"number","default":35},"peso_vulnerabilidad":{"type":"number","default":0.4}}},"impl":{"kind":"sql","template":"SELECT h3_index, lst_temp, ndvi_veg, (0.4 * lst_temp + 0.4 * (1.0 - ndvi_veg) + 0.2 * pop_vulnerable) as urgencia_termica FROM {{in}} ORDER BY urgencia_termica DESC;"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for sondajes-mineros-global v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000032',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Optimización de Sondajes Global","nodes":[{"id":"in","type":"core.source.csv","version":"0.1.0","params":{"path":"sondajes_previos.csv"},"position":{"x":0,"y":0},"label":"Muestras de Pozos"},{"id":"kriging","type":"hub.global.sondajes-optimos","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Geoestadística & Kriging"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"incertidumbre_reducida","op":">","value":"100000"},"position":{"x":1300,"y":0},"label":"Próximo Sondaje Óptimo"},{"id":"costos_perforacion","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://exploracion/costos.csv"},"position":{"x":0,"y":150},"label":"Costo por metro perforado"},{"id":"unir_costos","type":"core.join","version":"0.1.0","params":{"leftColumn":"zona","rightColumn":"zona","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir sondajes con costos"},{"id":"tipos_sondaje","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"ley_pct","to":"number"},{"column":"profundidad_m","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar leyes y profundidad"},{"id":"valor_informacion","type":"core.formula","version":"0.1.0","params":{"name":"voi_por_peso","column":"valor_informacion","op":"/","otherColumn":"costo_total"},"position":{"x":1040,"y":0},"label":"Valor por peso invertido"},{"id":"mejor_ubicacion","type":"core.sort","version":"0.1.0","params":{"column":"voi_por_peso","direction":"DESC"},"position":{"x":1560,"y":0},"label":"Mejores ubicaciones"},{"id":"incertidumbre_zona","type":"core.view.bar","version":"0.1.0","params":{"x":"zona","y":"varianza_kriging","title":"Incertidumbre por zona"},"position":{"x":1300,"y":150},"label":"Incertidumbre por zona"},{"id":"proximos_pozos","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":0},"label":"Próximos pozos"}],"edges":[{"id":"in_out__unir_costos_left","from":{"node":"in","port":"out"},"to":{"node":"unir_costos","port":"left"}},{"id":"costos_perforacion_out__unir_costos_right","from":{"node":"costos_perforacion","port":"out"},"to":{"node":"unir_costos","port":"right"}},{"id":"unir_costos_out__tipos_sondaje_in","from":{"node":"unir_costos","port":"out"},"to":{"node":"tipos_sondaje","port":"in"}},{"id":"tipos_sondaje_out__kriging_in","from":{"node":"tipos_sondaje","port":"out"},"to":{"node":"kriging","port":"in"}},{"id":"kriging_out__valor_informacion_in","from":{"node":"kriging","port":"out"},"to":{"node":"valor_informacion","port":"in"}},{"id":"valor_informacion_out__incertidumbre_zona_in","from":{"node":"valor_informacion","port":"out"},"to":{"node":"incertidumbre_zona","port":"in"}},{"id":"valor_informacion_out__out_in","from":{"node":"valor_informacion","port":"out"},"to":{"node":"out","port":"in"}},{"id":"out_out__mejor_ubicacion_in","from":{"node":"out","port":"out"},"to":{"node":"mejor_ubicacion","port":"in"}},{"id":"mejor_ubicacion_out__proximos_pozos_in","from":{"node":"mejor_ubicacion","port":"out"},"to":{"node":"proximos_pozos","port":"in"}}],"customNodes":[{"id":"hub.global.sondajes-optimos","version":"0.1.0","name":"Optimización de Sondajes y Reducción de Incertidumbre","category":"Geología Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"costo_metro_usd":{"type":"number","default":250},"metodo_estimacion":{"type":"string","default":"kriging_ordinario"}}},"impl":{"kind":"python","entry":"run_kriging_evoi","code":"def run_kriging_evoi(df, **params):\n    return df\n"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for biomecanica-deportiva-global v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000033',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Cinemática Deportiva Global","nodes":[{"id":"cam","type":"core.source.csv","version":"0.1.0","params":{"path":"tracking_video.csv"},"position":{"x":0,"y":0},"label":"Video de Carrera"},{"id":"phys","type":"hub.global.cinematica-deportiva","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Módulo Homografía & Metros Extra"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"metros_extra_curva","op":">","value":"1.0"},"position":{"x":1300,"y":0},"label":"Métricas Reales Verificadas"},{"id":"medidas_pista","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://deporte/pista.csv"},"position":{"x":0,"y":150},"label":"Medidas oficiales de la pista"},{"id":"unir_pista","type":"core.join","version":"0.1.0","params":{"leftColumn":"carril","rightColumn":"carril","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir trayectorias con la pista"},{"id":"tipos_frames","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"t_s","to":"number"},{"column":"x_m","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar tiempos"},{"id":"metros_extra","type":"core.formula","version":"0.1.0","params":{"name":"metros_extra","column":"distancia_real_m","op":"-","otherColumn":"distancia_oficial_m"},"position":{"x":1040,"y":0},"label":"Metros de más en curva"},{"id":"por_atleta","type":"core.group","version":"0.1.0","params":{"groupBy":["atleta"],"aggregations":[{"column":"metros_extra","fn":"SUM","name":"metros_extra_total"},{"column":"velocidad_m_s","fn":"MAX","name":"velocidad_max"}]},"position":{"x":1560,"y":0},"label":"Resumen por atleta"},{"id":"velocidad","type":"core.view.line","version":"0.1.0","params":{"x":"t_s","y":"velocidad_m_s","series":"atleta"},"position":{"x":1300,"y":150},"label":"Velocidad en la carrera"},{"id":"relato","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":0},"label":"Datos para el relato"}],"edges":[{"id":"cam_out__unir_pista_left","from":{"node":"cam","port":"out"},"to":{"node":"unir_pista","port":"left"}},{"id":"medidas_pista_out__unir_pista_right","from":{"node":"medidas_pista","port":"out"},"to":{"node":"unir_pista","port":"right"}},{"id":"unir_pista_out__tipos_frames_in","from":{"node":"unir_pista","port":"out"},"to":{"node":"tipos_frames","port":"in"}},{"id":"tipos_frames_out__phys_in","from":{"node":"tipos_frames","port":"out"},"to":{"node":"phys","port":"in"}},{"id":"phys_out__metros_extra_in","from":{"node":"phys","port":"out"},"to":{"node":"metros_extra","port":"in"}},{"id":"metros_extra_out__velocidad_in","from":{"node":"metros_extra","port":"out"},"to":{"node":"velocidad","port":"in"}},{"id":"metros_extra_out__out_in","from":{"node":"metros_extra","port":"out"},"to":{"node":"out","port":"in"}},{"id":"out_out__por_atleta_in","from":{"node":"out","port":"out"},"to":{"node":"por_atleta","port":"in"}},{"id":"por_atleta_out__relato_in","from":{"node":"por_atleta","port":"out"},"to":{"node":"relato","port":"in"}}],"customNodes":[{"id":"hub.global.cinematica-deportiva","version":"0.1.0","name":"Análisis Biomecánico y Cinemática Deportiva por Video","category":"Deporte Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"longitud_pista_m":{"type":"number","default":400},"carril_referencia":{"type":"integer","default":1}}},"impl":{"kind":"python","entry":"track_and_homography","code":"def track_and_homography(df, **params):\n    return df\n"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for estres-recursos-global v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000034',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Capacidad de Carga Global","nodes":[{"id":"proy","type":"core.source.csv","version":"0.1.0","params":{"path":"data_centers_plan.csv"},"position":{"x":0,"y":0},"label":"Mega-Industrias / Data Centers"},{"id":"eval","type":"hub.global.estres-recursos-megaproyectos","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Balance Cuenca & Subestación"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"stress_pct","op":">","value":"15.0"},"position":{"x":1300,"y":0},"label":"Semáforo de Viabilidad Ambiental"},{"id":"balance_cuenca","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://cuencas/balance.csv"},"position":{"x":0,"y":150},"label":"Balance hídrico de la cuenca"},{"id":"unir_cuenca","type":"core.join","version":"0.1.0","params":{"leftColumn":"cuenca_id","rightColumn":"cuenca_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir proyecto con su cuenca"},{"id":"tipos_consumo","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"agua_m3_dia","to":"number"},{"column":"energia_mwh_dia","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar consumos"},{"id":"estres","type":"core.formula","version":"0.1.0","params":{"name":"indice_estres","column":"agua_m3_dia","op":"/","otherColumn":"recarga_m3_dia"},"position":{"x":1040,"y":0},"label":"Consumo sobre recarga"},{"id":"estres_anual","type":"core.view.line","version":"0.1.0","params":{"x":"mes","y":"indice_estres"},"position":{"x":1300,"y":150},"label":"Estrés a lo largo del año"},{"id":"consumo_vs_recarga","type":"core.view.bar","version":"0.1.0","params":{"x":"mes","y":"agua_m3_dia","title":"Consumo frente a recarga"},"position":{"x":1300,"y":300},"label":"Consumo frente a recarga"},{"id":"veredicto","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":0},"label":"¿La cuenca lo soporta?"}],"edges":[{"id":"proy_out__unir_cuenca_left","from":{"node":"proy","port":"out"},"to":{"node":"unir_cuenca","port":"left"}},{"id":"balance_cuenca_out__unir_cuenca_right","from":{"node":"balance_cuenca","port":"out"},"to":{"node":"unir_cuenca","port":"right"}},{"id":"unir_cuenca_out__tipos_consumo_in","from":{"node":"unir_cuenca","port":"out"},"to":{"node":"tipos_consumo","port":"in"}},{"id":"tipos_consumo_out__eval_in","from":{"node":"tipos_consumo","port":"out"},"to":{"node":"eval","port":"in"}},{"id":"eval_out__estres_in","from":{"node":"eval","port":"out"},"to":{"node":"estres","port":"in"}},{"id":"estres_out__estres_anual_in","from":{"node":"estres","port":"out"},"to":{"node":"estres_anual","port":"in"}},{"id":"estres_out__consumo_vs_recarga_in","from":{"node":"estres","port":"out"},"to":{"node":"consumo_vs_recarga","port":"in"}},{"id":"estres_out__out_in","from":{"node":"estres","port":"out"},"to":{"node":"out","port":"in"}},{"id":"out_out__veredicto_in","from":{"node":"out","port":"out"},"to":{"node":"veredicto","port":"in"}}],"customNodes":[{"id":"hub.global.estres-recursos-megaproyectos","version":"0.1.0","name":"Capacidad de Carga y Estrés Hídrico-Energético","category":"Medio Ambiente Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"limite_estres_pct":{"type":"number","default":20}}},"impl":{"kind":"sql","template":"SELECT proyecto_id, mw_demand, liters_sec_cooling, (liters_sec_cooling / cuenca_recharge_sec) * 100.0 as stress_pct FROM {{in}};"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for drenaje-inundaciones-global v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000035',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Drenaje e Inundaciones Global","nodes":[{"id":"meteo","type":"core.source.csv","version":"0.1.0","params":{"path":"radar_lluvia.csv"},"position":{"x":0,"y":0},"label":"Radar de Precipitación"},{"id":"topo","type":"hub.global.drenaje-inundaciones","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Modelo Escorrentía & Sumideros"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"accion","op":"=","value":"DESPACHAR_CUADRILLA"},"position":{"x":1300,"y":0},"label":"Despacho Preventivo de Cuadrillas"},{"id":"sumideros","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://ciudad/sumideros.csv"},"position":{"x":0,"y":150},"label":"Catastro de sumideros"},{"id":"unir_sumideros","type":"core.join","version":"0.1.0","params":{"leftColumn":"cuadra_id","rightColumn":"cuadra_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Unir terreno con sumideros"},{"id":"tipos_lluvia","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"mm_hora","to":"number"},{"column":"capacidad_l_s","to":"number"}]},"position":{"x":520,"y":0},"label":"Normalizar lluvia"},{"id":"saturacion","type":"core.formula","version":"0.1.0","params":{"name":"saturacion","column":"caudal_l_s","op":"/","otherColumn":"capacidad_l_s"},"position":{"x":1040,"y":0},"label":"Agua sobre capacidad"},{"id":"cuadras_criticas","type":"core.sort","version":"0.1.0","params":{"column":"saturacion","direction":"DESC"},"position":{"x":1560,"y":0},"label":"Cuadras más críticas"},{"id":"lluvia_horaria","type":"core.view.line","version":"0.1.0","params":{"x":"hora","y":"mm_hora"},"position":{"x":780,"y":150},"label":"Lluvia pronosticada"},{"id":"despacho","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1820,"y":0},"label":"Despacho de cuadrillas"}],"edges":[{"id":"meteo_out__unir_sumideros_left","from":{"node":"meteo","port":"out"},"to":{"node":"unir_sumideros","port":"left"}},{"id":"sumideros_out__unir_sumideros_right","from":{"node":"sumideros","port":"out"},"to":{"node":"unir_sumideros","port":"right"}},{"id":"unir_sumideros_out__tipos_lluvia_in","from":{"node":"unir_sumideros","port":"out"},"to":{"node":"tipos_lluvia","port":"in"}},{"id":"tipos_lluvia_out__lluvia_horaria_in","from":{"node":"tipos_lluvia","port":"out"},"to":{"node":"lluvia_horaria","port":"in"}},{"id":"tipos_lluvia_out__topo_in","from":{"node":"tipos_lluvia","port":"out"},"to":{"node":"topo","port":"in"}},{"id":"topo_out__saturacion_in","from":{"node":"topo","port":"out"},"to":{"node":"saturacion","port":"in"}},{"id":"saturacion_out__out_in","from":{"node":"saturacion","port":"out"},"to":{"node":"out","port":"in"}},{"id":"out_out__cuadras_criticas_in","from":{"node":"out","port":"out"},"to":{"node":"cuadras_criticas","port":"in"}},{"id":"cuadras_criticas_out__despacho_in","from":{"node":"cuadras_criticas","port":"out"},"to":{"node":"despacho","port":"in"}}],"customNodes":[{"id":"hub.global.drenaje-inundaciones","version":"0.1.0","name":"Gestión Preventiva de Drenaje e Inundaciones Pluviales","category":"Hidrología Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_alerta_mm_hora":{"type":"number","default":20}}},"impl":{"kind":"sql","template":"SELECT sumidero_id, direccion, pendiente_deg, mm_lluvia_proyectada, CASE WHEN mm_lluvia_proyectada > 20.0 THEN 'DESPACHAR_CUADRILLA' ELSE 'NORMAL' END as accion FROM {{in}};"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for auditoria-agentes-global v0.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000036',
  '0.2.0',
  $flow${"format":"nodomics/flow@0","name":"Auditoría Forense de Agentes Global","nodes":[{"id":"agent","type":"core.source.csv","version":"0.1.0","params":{"path":"agent_actions.csv"},"position":{"x":0,"y":0},"label":"Agente Autónomo a Auditar"},{"id":"audit","type":"hub.global.auditoria-agentes-ia","version":"0.1.0","params":{},"position":{"x":780,"y":0},"label":"Testigo Silencioso & Comparador"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"desalineacion_detectada","op":"=","value":"true"},"position":{"x":1040,"y":0},"label":"Certificado de Confiabilidad"},{"id":"registro_sandbox","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://auditoria/syscalls.csv"},"position":{"x":0,"y":150},"label":"Lo que hizo en el sandbox"},{"id":"cruzar_relato","type":"core.join","version":"0.1.0","params":{"leftColumn":"accion_id","rightColumn":"accion_id","how":"LEFT"},"position":{"x":260,"y":0},"label":"Cruzar lo dicho con lo hecho"},{"id":"tipos_eventos","type":"core.cast","version":"0.1.0","params":{"conversions":[{"column":"timestamp","to":"date-iso"}]},"position":{"x":520,"y":0},"label":"Normalizar eventos"},{"id":"discrepancias","type":"core.filter","version":"0.1.0","params":{"column":"coincide","op":"=","value":"false"},"position":{"x":1300,"y":0},"label":"Dijo una cosa, hizo otra"},{"id":"por_prueba","type":"core.group","version":"0.1.0","params":{"groupBy":["prueba"],"aggregations":[{"column":"accion_id","fn":"COUNT","name":"acciones"}]},"position":{"x":1560,"y":0},"label":"Resultado por prueba"},{"id":"fallas_por_prueba","type":"core.view.bar","version":"0.1.0","params":{"x":"prueba","y":"acciones","title":"Fallas por prueba"},"position":{"x":1820,"y":0},"label":"Fallas por prueba"},{"id":"informe","type":"core.view.table","version":"0.1.0","params":{"rows":50},"position":{"x":1560,"y":150},"label":"Informe forense"}],"edges":[{"id":"agent_out__cruzar_relato_left","from":{"node":"agent","port":"out"},"to":{"node":"cruzar_relato","port":"left"}},{"id":"registro_sandbox_out__cruzar_relato_right","from":{"node":"registro_sandbox","port":"out"},"to":{"node":"cruzar_relato","port":"right"}},{"id":"cruzar_relato_out__tipos_eventos_in","from":{"node":"cruzar_relato","port":"out"},"to":{"node":"tipos_eventos","port":"in"}},{"id":"tipos_eventos_out__audit_in","from":{"node":"tipos_eventos","port":"out"},"to":{"node":"audit","port":"in"}},{"id":"audit_out__out_in","from":{"node":"audit","port":"out"},"to":{"node":"out","port":"in"}},{"id":"out_out__discrepancias_in","from":{"node":"out","port":"out"},"to":{"node":"discrepancias","port":"in"}},{"id":"discrepancias_out__por_prueba_in","from":{"node":"discrepancias","port":"out"},"to":{"node":"por_prueba","port":"in"}},{"id":"por_prueba_out__fallas_por_prueba_in","from":{"node":"por_prueba","port":"out"},"to":{"node":"fallas_por_prueba","port":"in"}},{"id":"discrepancias_out__informe_in","from":{"node":"discrepancias","port":"out"},"to":{"node":"informe","port":"in"}}],"customNodes":[{"id":"hub.global.auditoria-agentes-ia","version":"0.1.0","name":"Sandbox de Confiabilidad y Auditoría Forense de Agentes","category":"Seguridad IA Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"nivel_aislamiento":{"type":"string","default":"estricto_read_only"}}},"impl":{"kind":"python","entry":"evaluate_agent_sandbox","code":"def evaluate_agent_sandbox(df, **params):\n    return df\n"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- ----------------------------------------------------------------------------
-- 4. Re-enable version advance trigger
-- ----------------------------------------------------------------------------

alter table public.publication_versions enable trigger before_version_insert;

-- ----------------------------------------------------------------------------
-- 5. Profile Cards for Match Feed (1024-dim Vector Search)
-- ----------------------------------------------------------------------------

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000001',
  $card${"schemaVersion":1,"about":"Ingeniero agrónomo y doctor en fisiología vegetal. Especialista en agrometeorología, sensores IoT y cadena de frío de exportación de arándanos y frambuesas en el Valle del Maule 🇨🇱 y Michoacán 🇲🇽.","technical":"codes","domains":[{"name":"agronomía","depth":"expert"},{"name":"sensores iot","depth":"expert"},{"name":"cadena de frío","depth":"expert"},{"name":"fisiología de berries","depth":"practitioner"}],"offers":["algoritmos de punto de rocío y heladas","calibración de sensores agrícolas en campo","modelos de pérdida de calidad postcosecha"],"seeks":["integración con imágenes multiespectrales Sentinel-2","sensores LoRaWAN de bajo consumo","modelos de machine learning climático"],"links":{"linkedin":"https://linkedin.com/in/mateo-albornoz-agro","github":"https://github.com/mateo-agrolab"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 1 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-mateo_agrolab',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000002',
  $card${"schemaVersion":1,"about":"Médica intensivista e informática médica en hospital público. Diseñando flujos clínicos para entrega de guardia SOAP, scoring fisiológico NEWS2 y seguridad farmacológica en urgencias y UCI.","technical":"builds","domains":[{"name":"informática médica","depth":"expert"},{"name":"medicina de urgencias","depth":"expert"},{"name":"farmacología clínica","depth":"practitioner"},{"name":"triage y deterioro precoz","depth":"expert"}],"offers":["protocolos clínicos validados para traspaso de turno","cálculos de dosificación pediátrica por superficie corporal","modelos de alerta de sepsis temprana"],"seeks":["modelos de Whisper / transcripción clínica local segura","interoperabilidad HL7 FHIR","herramientas sin fuga de datos de pacientes"],"links":{"linkedin":"https://linkedin.com/in/valentina-castro-md","github":"https://github.com/valencastro"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 2 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-valencastro_md',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000003',
  $card${"schemaVersion":1,"about":"Profesor de Física y Ciencias de la Computación en liceos técnicos de Chile. Entusiasta del aprendizaje basado en datos reales sobre consumo eléctrico escolar y eficiencia energética.","technical":"builds","domains":[{"name":"educación stem","depth":"expert"},{"name":"eficiencia energética escolar","depth":"practitioner"},{"name":"estadística didáctica","depth":"expert"}],"offers":["secuencias didácticas con datos reales de medidores","algoritmos robustos simplificados para estudiantes (MAD)","talleres de pensamiento computacional en aula"],"seeks":["colegas docentes para laboratorios cruzados","visualizaciones interactivas de consumo para estudiantes","smart meters de código abierto"],"links":{"linkedin":"https://linkedin.com/in/tomas-baeza-edu","website":"https://cienciasabiertas.cl"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 3 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-tomas_edu',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000004',
  $card${"schemaVersion":1,"about":"Ingeniera comercial y consultora de abastecimiento pyme. Articulo redes de compras colectivas y gestión inteligente de inventario para almacenes de barrio y minimarkets independientes.","technical":"builds","domains":[{"name":"retail pyme","depth":"expert"},{"name":"gestión de inventarios","depth":"expert"},{"name":"compras agrupadas","depth":"expert"},{"name":"márgenes y pricing","depth":"practitioner"}],"offers":["modelos de punto de reorden con stock de seguridad","red de compra colectiva de abarrotes de alta rotación","validadores de márgenes con IVA descontado"],"seeks":["integración con facturación electrónica SII","conexión directa con cooperativas y molinos mayoristas","bots de pedidos comunitarios por WhatsApp"],"links":{"linkedin":"https://linkedin.com/in/francisca-silva-retail"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 4 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-fran_retail',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000005',
  $card${"schemaVersion":1,"about":"Científico de datos espaciales y cartógrafo. Construyo observatorios ciudadanos de calidad del aire con estaciones SINCA del MMA Chile y malla hexagonal Uber H3 con datos de población Censo.","technical":"codes","domains":[{"name":"análisis geoespacial","depth":"expert"},{"name":"calidad del aire sinca","depth":"expert"},{"name":"uber h3","depth":"expert"},{"name":"datos públicos abiertos","depth":"practitioner"}],"offers":["pipelines de ingestión de redes SINCA Chile","indexación territorial hexagonal H3 multinivel","cálculo de isla de calor urbana LST/NDVI"],"seeks":["investigadores en epidemiología ambiental","activistas comunitarios por la justicia ambiental","datos satelitales Landsat/MODIS en tiempo real"],"links":{"github":"https://github.com/rodrigo-morales-geo","website":"https://geodatos.cl"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 5 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-rodrigo_geodatos',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000006',
  $card${"schemaVersion":1,"about":"CFO fraccional y consultora financiera para pymes b2b. Experta en flujo de caja proyectado, cobranza preventiva, cálculo de intereses moratorios legales y scoring de crédito.","technical":"codes","domains":[{"name":"flujo de caja","depth":"expert"},{"name":"scoring crediticio","depth":"expert"},{"name":"legislación financiera","depth":"practitioner"},{"name":"cobranza pyme","depth":"expert"}],"offers":["modelos de proyección de tesorería a 90 días","fórmulas automatizadas de interés penal legal Ley 18010","matrices de riesgo y puntualidad de deudores"],"seeks":["conectores bancarios Open Banking en Chile","modelos probabilísticos de quiebra empresarial","automatización de cartas de cobranza prejudicial"],"links":{"linkedin":"https://linkedin.com/in/camila-vergara-finanzas","github":"https://github.com/camila-finanzas"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 6 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-camila_finanzas',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000007',
  $card${"schemaVersion":1,"about":"Ingeniero civil electricista especializado en plantas solares fotovoltaicas utility-scale y generación distribuida PMGD en el Desierto de Atacama y zona central de Chile.","technical":"codes","domains":[{"name":"energía solar fotovoltaica","depth":"expert"},{"name":"irradiancia solar","depth":"expert"},{"name":"parques solares atacama","depth":"practitioner"}],"offers":["modelos de irradiancia en plano inclinado GTI","curvas de degradación de paneles monocristalinos","análisis de pérdidas por polvo y soiling"],"seeks":["datos de piranómetros locales calibrados","modelos predictivos de radiación con nubes","operadores de parques solares para validación empírica"],"links":{"linkedin":"https://linkedin.com/in/matias-solar-energy","github":"https://github.com/matias-solar"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 7 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-matias_solar',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000008',
  $card${"schemaVersion":1,"about":"Ingeniero civil calculista estructural. Especialista en diseño sismo-resistente bajo norma chilena NCh433, espectros de diseño elásticos e inelásticos y control de derivas de piso.","technical":"codes","domains":[{"name":"cálculo estructural","depth":"expert"},{"name":"diseño sísmico nch433","depth":"expert"},{"name":"dinámica de estructuras","depth":"practitioner"}],"offers":["generador de espectros de diseño sísmico NCh433 Of.96 Mod 2009","cálculo de cortante basal mínimo y máximo","verificación de distorsión de entrepiso"],"seeks":["arquitectos y constructores","registros acelerográficos del CSN","software de elementos finitos de código abierto"],"links":{"linkedin":"https://linkedin.com/in/esteban-larrain-estructuras"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 8 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-esteban_estructuras',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000009',
  $card${"schemaVersion":1,"about":"Comerciante de abarrotes con 22 años atendiendo almacén de barrio en Puente Alto. Busco simplificar el cuadre de caja diario, calcular el punto de equilibrio y comprar más barato junto a otros colegas.","technical":"uses","domains":[{"name":"comercio de abarrotes","depth":"expert"},{"name":"atención de barrio","depth":"expert"},{"name":"control de caja","depth":"practitioner"}],"offers":["experiencia real de rotación de productos populares","conocimiento de hábitos de compra de barrio"],"seeks":["planillas simples que no se tranque el computador","red de almacenes para comprar arroz y aceite más barato","apoyo para cuadrar la caja rápido"],"links":{"website":"https://almacendonpepe.cl"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 9 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-don_pepe_almacen',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000010',
  $card${"schemaVersion":1,"about":"Cirujana dentista y ortodoncista. Automatizando el control de insumos clínicos, trazabilidad de esterilización por autoclave y seguimiento de presupuestos de tratamientos integrales.","technical":"builds","domains":[{"name":"odontología","depth":"expert"},{"name":"ortodoncia","depth":"expert"},{"name":"gestión clínica dental","depth":"practitioner"}],"offers":["protocolos de inventario para box dental","fichas de seguimiento de brackets y alineadores","trazabilidad de instrumental esterilizado"],"seeks":["integración con radiografías panorámicas DICOM","recordatorios automáticos de control a pacientes","control de costos por sillón/hora"],"links":{"linkedin":"https://linkedin.com/in/lucia-valenzuela-odontologia"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 10 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-dra_lucia_dental',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000011',
  $card${"schemaVersion":1,"about":"Médico veterinario especialista en producción bovina de leche y carne en la Región de Los Lagos. Monitoreo de producción lechera, protocolos sanitarios de brucelosis/tuberculosis y nutrición en praderas.","technical":"builds","domains":[{"name":"veterinaria de grandes animales","depth":"expert"},{"name":"producción lechera","depth":"expert"},{"name":"salud de ubres y mastitis","depth":"expert"}],"offers":["tableros de control de partos y secado","cálculo de ración balanceada en base a materia seca de pradera","curvas de lactancia individuales y por rebaño"],"seeks":["sensores de rumia y collares electrónicos","datos meteorológicos locales de estrés calórico THI","colegas agrónomos para manejo de forraje"],"links":{"linkedin":"https://linkedin.com/in/hugo-sanmartin-veterinaria"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 11 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-dr_hugo_ganado',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000012',
  $card${"schemaVersion":1,"about":"Administrador de ferretería industrial y materiales de obra gruesa en San Bernardo. Gestiono más de 8.000 SKUs de fijaciones, tuberías, pinturas y herramientas eléctricas.","technical":"builds","domains":[{"name":"ferretería industrial","depth":"expert"},{"name":"control de inventario sku","depth":"expert"},{"name":"materiales de construcción","depth":"practitioner"}],"offers":["matriz de clasificación ABC para ferreterías","fórmulas de stock mínimo para tornillería y fitting","cotizador rápido de listas de obra para maestros"],"seeks":["lectores de códigos de barra rápidos","listas de precios actualizadas de importadores mayoristas","sistemas de alerta de quiebre de stock"],"links":{"website":"https://ferreteriacentral.cl"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 12 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-ferreteria_central',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000013',
  $card${"schemaVersion":1,"about":"Enfermera jefa del programa cardiovascular en CESFAM Padre Las Casas, Araucanía. Diseñando flujos de detección temprana de pacientes crónicos inasistentes.","technical":"builds","domains":[{"name":"salud primaria cesfam","depth":"expert"},{"name":"seguimiento cardiovascular","depth":"expert"},{"name":"atención comunitaria","depth":"practitioner"}],"offers":["protocolos de rescate de pacientes crónicos","flujos validados de cruce con farmacia"],"seeks":["integración con Rayen Salud","alertas sms comunitarias"],"links":{"linkedin":"https://linkedin.com/in/camila-rojas-salud"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 13 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-camila_cesfam',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000014',
  $card${"schemaVersion":1,"about":"Planificadora territorial y geógrafa en la Municipalidad de Coquimbo. Trabajo con microdatos censales y regularización de tomas y loteos irregulares.","technical":"builds","domains":[{"name":"censo y territorio","depth":"expert"},{"name":"gestión municipal","depth":"expert"},{"name":"georreferenciación rural","depth":"practitioner"}],"offers":["algoritmos de limpieza de direcciones chilenas","normalización de grillas censales"],"seeks":["geógrafos de zonas rurales","modelos de validación catastral"],"links":{"website":"https://municoquimbo.cl"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 14 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-ana_coquimbo',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000015',
  $card${"schemaVersion":1,"about":"Orientador y docente en el Liceo Bicentenario de Ancud, Chiloé. Investigando el impacto del aislamiento insular y el clima lluvioso en el ausentismo escolar.","technical":"uses","domains":[{"name":"asistencia escolar","depth":"expert"},{"name":"ruralidad chiloe","depth":"expert"},{"name":"apoyo psicosocial","depth":"practitioner"}],"offers":["red de apoyo psicosocial por ausentismo","indicadores de alerta temprana en Chiloé"],"seeks":["colegas de colegios rurales","tableros visuales para apoderados"],"links":{"linkedin":"https://linkedin.com/in/rodrigo-leiva-ancud"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 15 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-rodrigo_ancud',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000016',
  $card${"schemaVersion":1,"about":"Analista de crecimiento y retención en startup de Valparaíso. Modela churn predictivo y cohortes de clientes recurrentes.","technical":"codes","domains":[{"name":"churn y retención","depth":"expert"},{"name":"modelos de suscripción","depth":"expert"},{"name":"analítica saas","depth":"practitioner"}],"offers":["modelos predictivos de bajas de suscriptores","análisis de cohortes de ingresos"],"seeks":["expertos en contratos corporativos b2b","especialistas en mediación de reglas"],"links":{"github":"https://github.com/tomas-ibarra-valpo"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 16 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-tomas_saas',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000017',
  $card${"schemaVersion":1,"about":"Encargada de operaciones en Almacén Cooperativo de Osorno. Controlando mermas y quiebres de inventario de pequeños productores lecheros y agrícolas.","technical":"builds","domains":[{"name":"cooperativas agrícolas","depth":"expert"},{"name":"bodegas y mermas","depth":"expert"},{"name":"cadena de perecibles","depth":"practitioner"}],"offers":["fórmulas de rotación de abarrotes secos","gestión comunitaria de bodegas"],"seeks":["especialistas en refrigeración y lácteos","apoyo para empalmar fórmulas de stock"],"links":{"website":"https://cooperativaosorno.cl"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 17 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-paula_osorno',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)
values (
  'a0000000-0000-4000-8000-000000000018',
  $card${"schemaVersion":1,"about":"Investigadora en biología molecular y diagnóstico genético en la Universidad de Concepción. Experta en qPCR y validación de biomarcadores.","technical":"codes","domains":[{"name":"biología molecular","depth":"expert"},{"name":"qpcr","depth":"expert"},{"name":"diagnóstico genético","depth":"practitioner"}],"offers":["nodos de normalización delta-delta-Cq","filtros de curvas de amplificación qPCR"],"seeks":["laboratorios clínicos para validación externa","bioinformáticos"],"links":{"linkedin":"https://linkedin.com/in/lucia-paredes-qpcr"}}$card$::jsonb,
  1,
  (select ('[' || string_agg((case when n = 18 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'seed-hash-lucia_qpcr',
  'voyage-code-3',
  now()
)
on conflict (profile_id) do update set
  card = excluded.card,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 6. Component Cards for Match Feed (36 Components)
-- ----------------------------------------------------------------------------

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'cadena-frio-berries',
  $comp${"kind":"app","name":"Cadena de Frío y Cosecha de Berries (Maule 🇨🇱 vs Michoacán 🇲🇽)","slug":"cadena-frio-berries","description":"Para exportadores y packings de berries que necesitan saber, a tiempo, cuándo una cámara o un camión refrigerado se sale de rango. Toma la telemetría de temperatura y humedad, limpia las lecturas caídas, calcula el punto de rocío y marca quiebres térmicos y riesgo de helada; termina en un gráfico que compara Maule con Michoacán. Úsala como base cambiando la fuente de sensores y los umbrales de tu fruta.","tags":["agronomia","berries","cadena-de-frio","iot","maule","michoacan"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 1 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'filtro-sensores-resiliente',
  $comp${"kind":"node","name":"Filtro de Sensores Resiliente","slug":"filtro-sensores-resiliente","description":"Para cualquier flujo que lea sensores con huecos. Recibe una serie con lecturas nulas y la entrega limpia, con la estrategia que elijas: ignorar los nulos, rellenarlos con cero o interpolar entre los vecinos (por ejemplo, [18.2, 22.1, null, 25.0]). Ponlo justo después de la fuente para que un sensor caído no rompa el resto del flujo.","tags":["agronomia","iot","calidad-de-datos","sensores","resiliencia"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 2 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'alerta-heladas-punto-rocio',
  $comp${"kind":"flow","name":"Alerta de Heladas Tardías y Punto de Rocío","slug":"alerta-heladas-punto-rocio","description":"Para agricultores con estación meteorológica que quieren adelantarse a una helada. A partir de temperatura y humedad relativa calcula el punto de rocío y entrega un semáforo de riesgo que distingue helada blanca (por radiación) de helada negra. Ajusta los umbrales del semáforo a tu cultivo y a tu zona.","tags":["agronomia","clima","heladas","punto-de-rocio","modulo"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 3 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'scribe-clinico-soap',
  $comp${"kind":"app","name":"Scribe Clínico & Traspaso de Guardia SOAP","slug":"scribe-clinico-soap","description":"Para equipos de urgencia y enfermería que entregan turno con poco tiempo. Ordena la nota de traspaso en formato SOAP (Subjetivo, Objetivo, Análisis, Plan), calcula el puntaje NEWS2 con los signos vitales y revisa dosis pediátricas por superficie corporal; termina en una vista que prioriza a los pacientes que más se deterioran. Es un apoyo a la entrega de turno: no reemplaza el criterio clínico.","tags":["salud","soap","urgencias","clinical-notes","traspaso-de-guardia"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 4 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'triage-news2',
  $comp${"kind":"flow","name":"Triage NEWS2 / Deterioro Fisiológico","slug":"triage-news2","description":"Para servicios de urgencia y hospitalización que quieren detectar antes el deterioro de un paciente. Recibe frecuencia respiratoria, saturación, presión, pulso, conciencia y temperatura, y entrega el puntaje NEWS2 con su nivel de alerta. Sirve como señal temprana: la decisión clínica sigue siendo del equipo.","tags":["salud","urgencias","news2","triage","fisiologia"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 5 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'dosis-pediatrica-mosteller',
  $comp${"kind":"node","name":"Dosis Pediátrica por Superficie Corporal (Mosteller)","slug":"dosis-pediatrica-mosteller","description":"Para farmacia clínica y pediatría. Recibe peso y talla, calcula la superficie corporal (m²) con la fórmula de Mosteller y la usa para escalar una dosis indicada por m². Úsalo como verificación de cálculo; la dosis final siempre la valida un profesional.","tags":["salud","pediatria","farmacologia","mosteller","dosificacion"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 6 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'laboratorio-escolar-electricidad',
  $comp${"kind":"app","name":"Laboratorio Escolar de Consumo Eléctrico","slug":"laboratorio-escolar-electricidad","description":"Para profesores de ciencias que quieren enseñar análisis de datos con datos reales de su colegio. Toma las lecturas del medidor eléctrico, las agrupa por bloque de clases y recreos, detecta consumos fuera de lo normal (como equipos encendidos de noche) con el método MAD y termina en un gráfico pensado para la sala. Cambia la fuente por el medidor de tu establecimiento.","tags":["educacion","stem","energia","colegios","ciencia-de-datos"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 7 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000003'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'agrupador-bloques-academicos',
  $comp${"kind":"flow","name":"Agrupador Temporal por Bloques Académicos (45 min vs 60 min)","slug":"agrupador-bloques-academicos","description":"Para analizar cualquier serie de tiempo escolar. Recibe registros con fecha y hora y los asigna al bloque de la jornada que corresponde (de 45 o 60 minutos, recreos incluidos), para comparar consumo o actividad por bloque. Ajusta el horario a la jornada de tu colegio.","tags":["educacion","horarios","bloques-academicos","analitica-escolar"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 8 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000003'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'detector-outliers-mad',
  $comp${"kind":"node","name":"Detector de Outliers MAD para Alumnos","slug":"detector-outliers-mad","description":"Para proyectos escolares de STEM que necesitan encontrar valores raros sin estadística avanzada. Recibe una columna numérica y marca los datos que se alejan de la mediana según la desviación absoluta mediana (MAD), un método robusto y fácil de explicar en clases. Puedes ajustar la sensibilidad con un solo parámetro.","tags":["educacion","estadistica","mad","outliers","didactico"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 9 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000003'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'radar-compras-agrupadas',
  $comp${"kind":"app","name":"Radar de Demanda y Compras Agrupadas para Almacenes","slug":"radar-compras-agrupadas","description":"Para almacenes de barrio y minimarkets que quieren comprar en conjunto y conseguir mejor precio. Junta los pedidos de varios almacenes, revisa el margen real de cada producto sin IVA, calcula cuándo reponer y entrega un resumen consolidado para negociar con la distribuidora. Úsala como base cambiando la lista de almacenes y productos.","tags":["pymes","almacenes","compras-colectivas","inventario","abastecimiento"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 10 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'punto-reorden-stock-seguridad',
  $comp${"kind":"flow","name":"Punto de Reorden con Stock de Seguridad","slug":"punto-reorden-stock-seguridad","description":"Para minoristas que se quedan sin stock o compran de más. Recibe la venta diaria, su variación y el plazo de entrega del proveedor, y entrega el punto de reorden con su stock de seguridad. Ajusta el nivel de servicio según cuánto te cuesta quedarte sin un producto.","tags":["pymes","logistica","inventario","stock-seguridad","reorden"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 11 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'validador-margen-neto-iva',
  $comp${"kind":"node","name":"Validador de Margen Neto con IVA Descontado","slug":"validador-margen-neto-iva","description":"Para negocios que fijan precios con IVA incluido y no saben cuánto ganan realmente. Recibe el precio de venta y el costo de cada producto, descuenta el IVA y entrega el margen de contribución real por producto. Cambia la tasa si tu país usa otra.","tags":["pymes","precios","iva","margen","contabilidad"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 12 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'observatorio-calidad-aire-sinca',
  $comp${"kind":"app","name":"Observatorio Comunal de Calidad del Aire (SINCA Chile / Censo H3)","slug":"observatorio-calidad-aire-sinca","description":"Para municipios y equipos de salud pública que quieren saber dónde el aire hace más daño. Toma los datos abiertos de calidad del aire del SINCA (MP2,5 y MP10 por hora), los agrega en hexágonos H3, los cruza con la población vulnerable del Censo y termina en un mapa de riesgo por barrio. Cambia la comuna o la fuente de datos para usarla en otra ciudad.","tags":["datos-publicos","sinca","medio-ambiente","h3","chile","salud-publica"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 13 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'indexador-hexagonal-h3',
  $comp${"kind":"flow","name":"Indexador Hexagonal Uber H3","slug":"indexador-hexagonal-h3","description":"Para cualquier flujo con coordenadas. Recibe puntos con latitud y longitud y les asigna su hexágono H3 en resolución 7, 8 u 9, para agregar y comparar zonas sin cargar mapas pesados. Elige la resolución según el tamaño de barrio que te interesa.","tags":["datos-publicos","geoespacial","h3","uber-h3","gis"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 14 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'indice-calor-urbano-normalizado',
  $comp${"kind":"node","name":"Índice de Calor Urbano Normalizado","slug":"indice-calor-urbano-normalizado","description":"Para equipos de urbanismo y medio ambiente. Recibe temperatura de superficie por zona y calcula un índice de isla de calor normalizado, para ver qué barrios se calientan más que el resto de la ciudad y dónde falta arbolado.","tags":["datos-publicos","clima-urbano","uhi","isla-de-calor","gis"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 15 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'centinela-flujo-caja',
  $comp${"kind":"app","name":"Centinela de Flujo de Caja y Cobranza Preventiva","slug":"centinela-flujo-caja","description":"Para pymes que facturan electrónicamente y sufren por pagos atrasados. Toma las facturas emitidas, clasifica a los clientes según cómo pagan, calcula el interés por mora según la Ley 18.010 y la ley de Pago a 30 Días, y proyecta la caja de los próximos 90 días. Cambia la fuente por la exportación de facturas de tu empresa.","tags":["finanzas","flujo-de-caja","cobranza","facturacion","scoring-b2b"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 16 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'scoring-cumplimiento-clientes',
  $comp${"kind":"flow","name":"Scoring de Cumplimiento de Clientes","slug":"scoring-cumplimiento-clientes","description":"Para empresas que venden con crédito a otras empresas. Recibe el historial de pagos y entrega un puntaje por cliente según días promedio de cobro (DSO) y días de mora acumulados, para decidir a quién seguir dando crédito.","tags":["finanzas","credito","scoring","riesgo","clientes"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 17 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'calculador-interes-penal-legal',
  $comp${"kind":"node","name":"Calculador de Interés Penal Diario Legal","slug":"calculador-interes-penal-legal","description":"Para administración y cobranza en Chile. Recibe el monto, la fecha de vencimiento y la fecha de pago, y calcula el interés por mora con la tasa de interés corriente de la Ley 18.010. Actualiza la tasa cada mes con la que publica la CMF.","tags":["finanzas","legal","interes-moratorio","ley-18010","chile"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 18 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'predictor-generacion-solar',
  $comp${"kind":"app","name":"Predictor de Generación Fotovoltaica y Degradación de Paneles","slug":"predictor-generacion-solar","description":"Para operadores y desarrolladores de plantas fotovoltaicas. Toma la radiación medida por el piranómetro, calcula la irradiancia sobre el plano inclinado de los paneles (GTI), descuenta las pérdidas por suciedad y termina en un gráfico de generación diaria esperada en MWh. Ajusta la inclinación y la tasa de suciedad a tu planta.","tags":["energia","solar","fotovoltaica","atacama","irradiancia"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 19 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000007'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'espectro-diseno-sismico-nch433',
  $comp${"kind":"app","name":"Espectro de Diseño Sísmico NCh433 & Verificación de Deriva","slug":"espectro-diseno-sismico-nch433","description":"Para ingenieros estructurales en Chile. A partir de la zona sísmica, el tipo de suelo y la categoría del edificio, genera el espectro elástico de diseño y calcula el corte basal mínimo según la NCh433 Of.96 Mod. 2009, y lo muestra en un gráfico. Es una ayuda de cálculo: la memoria estructural la firma el profesional responsable.","tags":["ingenieria-civil","sismica","nch433","estructuras","chile"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 20 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000008'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'cuadre-caja-equilibrio-abarrotes',
  $comp${"kind":"app","name":"Cuadre de Caja Diario y Punto de Equilibrio de Abarrotes","slug":"cuadre-caja-equilibrio-abarrotes","description":"Para el almacén de barrio que cierra la caja a mano. Junta las ventas del día en efectivo, tarjeta y fiado, y calcula cuánto hay que vender para cubrir arriendo, luz y demás costos fijos. Cambia los costos fijos por los de tu local.","tags":["abarrotes","caja-diaria","punto-equilibrio","almacen"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 21 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000009'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'control-insumos-box-dental',
  $comp${"kind":"app","name":"Control de Insumos Clínicos y Trazabilidad de Esterilización","slug":"control-insumos-box-dental","description":"Para clínicas dentales que quieren dejar de perder insumos vencidos. Lleva el stock de resinas, anestubos y arcos de ortodoncia, filtra los que vencen pronto y registra los lotes que pasaron por el autoclave. Cambia la lista de insumos por la de tu clínica.","tags":["odontologia","insumos-dentales","esterilizacion","clinica"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 22 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000010'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'control-rebao-curva-lactancia',
  $comp${"kind":"app","name":"Monitoreo de Rebaño Lechero y Curvas de Lactancia","slug":"control-rebao-curva-lactancia","description":"Para lecherías del sur de Chile. Toma el control lechero diario por vaca, proyecta su curva de lactancia (modelo de Wood) y avisa cuando la producción cae de golpe, una señal temprana de mastitis subclínica. Ajusta el umbral de caída a tu rebaño.","tags":["veterinaria","ganaderia","leche","bovinos","los-lagos"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 23 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000011'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'matriz-abc-inventario-ferretero',
  $comp${"kind":"app","name":"Matriz ABC y Reposición de Inventario Ferretero","slug":"matriz-abc-inventario-ferretero","description":"Para ferreterías con miles de productos. Clasifica cada artículo en A, B o C según cuánto dinero mueve y cuánto rota, filtra los clase A y prepara la reposición quincenal. Cambia la frecuencia de reposición según tus proveedores.","tags":["ferreteria","inventario-abc","materiales","sku"],"version":"1.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 24 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000012'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'controles-cronicos-atrasados',
  $comp${"kind":"app","name":"Controles crónicos atrasados","slug":"controles-cronicos-atrasados","description":"Para equipos de CESFAM que quieren recuperar a pacientes crónicos que dejaron de venir. Cruza los retiros de medicamentos en farmacia con la agenda médica, encuentra a los pacientes con diabetes o hipertensión que llevan más de 6 meses sin control y entrega la lista para contactarlos. Se probó en el CESFAM Padre Las Casas con 214 fichas.","tags":["salud","cesfam","cronicos","se-trenza","probada-con-214-fichas"],"version":"1.3.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 25 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000013'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'limpieza-censo-comunal',
  $comp${"kind":"app","name":"Limpieza del censo comunal","slug":"limpieza-censo-comunal","description":"Para municipios que trabajan con direcciones desordenadas. Normaliza direcciones irregulares, incluidas tomas de terreno y sectores rurales, y las ubica en la grilla censal. Nació en Coquimbo; cuando otros municipios la usaron y falló con direcciones rurales, un geógrafo de la comunidad la reparó y hoy corre validada.","tags":["datos-publicos","censo","coquimbo","se-empalma","reparada-y-probada-de-nuevo"],"version":"2.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 26 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000014'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'asistencia-escolar-curso',
  $comp${"kind":"app","name":"Asistencia escolar por curso","slug":"asistencia-escolar-curso","description":"Para colegios que quieren detectar el ausentismo crónico antes de que sea deserción. Toma el libro de asistencia, cruza las ausencias con días de lluvia y el aislamiento de cada estudiante, y avisa qué cursos y alumnos necesitan apoyo psicosocial. Se probó en 6 colegios de Ancud, en Chiloé.","tags":["educacion","asistencia","chiloe","se-trenza","probada-en-6-colegios"],"version":"1.4.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 27 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000015'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'churn-mensual-suscriptores',
  $comp${"kind":"app","name":"Churn mensual de suscriptores","slug":"churn-mensual-suscriptores","description":"Para negocios con suscripciones que quieren entender por qué se van sus clientes. Toma las suscripciones activas, filtra las bajas del mes y las muestra por cohorte. Nació en Valparaíso para clientes personas; una adaptación para empresas chocó con esa regla y el agente propuso una solución que todavía espera revisión humana.","tags":["ventas","churn","saas","se-enreda","propuesta-agente-sin-revisar"],"version":"1.2.0-conflict"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 28 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000016'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'quiebres-stock-bodega',
  $comp${"kind":"app","name":"Quiebres de stock en bodega","slug":"quiebres-stock-bodega","description":"Para bodegas que quieren enterarse de los quiebres de stock antes que el cliente. Revisa el inventario, detecta los productos por debajo del mínimo y avisa a compras. Se diseñó para abarrotes secos en Osorno; al probarla en una bodega de lácteos falló, porque no considera vencimientos cortos. Espera que alguien de la comunidad la adapte.","tags":["ventas","bodega","mermas","se-triza","fallo-datos-otra-bodega"],"version":"1.1.0-broken"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 29 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000017'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'normalizacion-qpcr',
  $comp${"kind":"node","name":"Normalización de qPCR","slug":"normalizacion-qpcr","description":"Para laboratorios de biología molecular. Recibe los ciclos umbral (Cq) de una placa de qPCR y los normaliza contra genes de referencia como GAPDH o actina, para comparar expresión entre muestras. Viene de la Universidad de Concepción y todavía no se ha probado fuera de ese laboratorio: es una buena primera pieza para adaptar.","tags":["laboratorio","qpcr","biologia-molecular","sin-adaptar","sin-probar-fuera-laboratorio"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 30 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000018'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'arborizacion-global',
  $comp${"kind":"app","name":"Mitigación de Islas de Calor y Corredores Verdes Urbanos","slug":"arborizacion-global","description":"Para ciudades que quieren plantar árboles donde más se necesitan. Cruza imágenes satelitales abiertas (Landsat o Sentinel) en una grilla hexagonal con la densidad de adultos mayores, y prioriza las calles donde reforestar baja más la temperatura para las personas más expuestas. Pensada para adaptarse a Sevilla, Phoenix, Monterrey o Santiago.","tags":["global","clima","ciudades","arboles","islas-de-calor","urbanismo"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 31 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'sondajes-mineros-global',
  $comp${"kind":"app","name":"Optimización de Sondajes y Valor de la Información","slug":"sondajes-mineros-global","description":"Para equipos de exploración minera o hídrica que deben decidir dónde perforar el próximo pozo. Estima el recurso en 3D a partir de los sondajes existentes, calcula cuánto cuesta la incertidumbre que queda y sugiere la ubicación que más la reduce por cada peso invertido. Pensada para adaptarse a Nevada, Zacatecas, Mendoza o Antofagasta.","tags":["global","geologia","mineria","agua","sondajes","bayesian"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 32 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000008'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'biomecanica-deportiva-global',
  $comp${"kind":"app","name":"Análisis Biomecánico y Cinemática Deportiva por Video","slug":"biomecanica-deportiva-global","description":"Para entrenadores y analistas deportivos. Toma el video de una carrera, sigue a cada atleta y proyecta su trayectoria sobre las medidas reales de la pista, el velódromo o la piscina, para calcular cuántos metros de más recorrió en las curvas. Como los cálculos salen de la geometría de la pista, el relato que genera se apoya en medidas y no en suposiciones.","tags":["global","deporte","atletismo","video","cinematica","biomecanica"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 33 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'estres-recursos-global',
  $comp${"kind":"app","name":"Capacidad de Carga y Estrés de Recursos para Megaproyectos","slug":"estres-recursos-global","description":"Para comunidades, autoridades y empresas que evalúan un centro de datos o una planta industrial. Proyecta cuánta agua y energía consumirá el proyecto y lo compara con lo que la cuenca puede recargar, para saber si el territorio lo soporta. Pensada para adaptarse a Querétaro, Frankfurt, Virginia o Santiago.","tags":["global","medio-ambiente","datacenters","agua","energia","sostenibilidad"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 34 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000007'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'drenaje-inundaciones-global',
  $comp${"kind":"app","name":"Gestión Preventiva de Drenaje e Inundaciones Pluviales","slug":"drenaje-inundaciones-global","description":"Para municipios que quieren limpiar los sumideros antes de la lluvia, no después. Cruza el pronóstico de lluvia por hora con la topografía y la capacidad de los sumideros, y prioriza a dónde mandar las cuadrillas antes de que se inunden las calles. Pensada para adaptarse a Guayaquil, Buenos Aires, Miami o Manila.","tags":["global","hidrologia","ciudades","drenaje","inundaciones","emergencias"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 35 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'auditoria-agentes-global',
  $comp${"kind":"app","name":"Sandbox de Confiabilidad y Auditoría Forense de Agentes","slug":"auditoria-agentes-global","description":"Para equipos que van a darle permisos reales a un agente de IA. Lo pone en un entorno aislado, le presenta pruebas adversarias y credenciales señuelo, y compara lo que el agente dice que hizo con lo que realmente hizo. Así se sabe si es confiable antes de conectarlo a sistemas reales.","tags":["global","seguridad","agentes","sandbox","red-teaming","alineacion"],"version":"0.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 36 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;
