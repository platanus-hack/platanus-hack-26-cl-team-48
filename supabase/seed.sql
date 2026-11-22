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
  $desc$Monitoreo continuo de temperatura, humedad y punto de rocío en cámaras frigoríficas y transporte refrigerado de arándanos y frambuesas entre el Valle del Maule y Michoacán. Detecta quiebres térmicos y heladas tardías.

Problema que resuelve: Pérdida crítica de fruta fresca de exportación por quiebres térmicos inadvertidos durante el transporte refrigerado Maule-Michoacán y heladas tardías que dañan la floración.

Resultados: Reducción del 34% en mermas por sobremaduración, detección de anomalías térmicas en <15 min y ahorro estimado de $42.000 USD por temporada.$desc$,
  array['agronomia', 'berries', 'cadena-de-frio', 'iot', 'maule', 'michoacan']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Filtro tolerante a fallas para telemetría de frío. Permite ignorar nulos, imputar con cero o interpolar en series continuas (ej. [18.2, 22.1, null, 25.0]) sin quebrar el pipeline.

Problema que resuelve: Telemetría IoT corrupta o intermitente en zonas rurales con caídas de señal que arroja lecturas nulas y aborta pipelines automáticos de monitoreo.

Resultados: 99.8% de disponibilidad de datos limpios mediante imputación e interpolación inteligente sin abortar ejecuciones de alertas.$desc$,
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
  $desc$Módulo compuesto para estaciones meteorológicas agrícolas. Calcula la temperatura de punto de rocío y emite semáforo de riesgo de helada por radiación y helada negra en huertos.

Problema que resuelve: Incapacidad de anticipar heladas por radiación y helada negra en huertos de berries con tiempo suficiente para activar aspersores térmicos.

Resultados: Alerta temprana con 4 horas de anticipación basada en punto de rocío, protegiendo 120 hectáreas de cultivo en Maule.$desc$,
  array['agronomia', 'clima', 'heladas', 'punto-de-rocio', 'modulo']::text[],
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

-- Publication 4: [APP] Scribe Clínico & Traspaso de Guardia SOAP (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000002',
  'scribe-clinico-soap',
  'app',
  $title$Scribe Clínico & Traspaso de Guardia SOAP$title$,
  $desc$Estructura notas de entrega de turno médico y enfermería bajo formato SOAP (Subjetivo, Objetivo, Análisis, Plan), calcula scores de deterioro fisiológico NEWS2 y valida dosis pediátricas por Mosteller.

Problema que resuelve: Pérdida de información crítica y errores de comunicación en el cambio de turno en urgencias, además de demoras en dosificación pediátrica de emergencia.

Resultados: 45% de reducción en tiempo de traspaso de guardia, 0 errores de dosificación pediátrica por Mosteller y detección oportuna de sepsis en triage NEWS2.$desc$,
  array['salud', 'soap', 'urgencias', 'clinical-notes', 'traspaso-de-guardia']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Módulo compuesto que implementa el score NEWS2 evaluando signos vitales para alertar oportunamente sobre sepsis y paro cardiorrespiratorio inminente.

Problema que resuelve: Detección tardía de descompensaciones clínicas silenciosas y sepsis en salas de hospitalización general.

Resultados: Identificación de deterioro clínico 3 horas antes del colapso fisiológico, reduciendo traslados tardíos a UCI en un 28%.$desc$,
  array['salud', 'urgencias', 'news2', 'triage', 'fisiologia']::text[],
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

-- Publication 6: [NODE] Dosis Pediátrica por Superficie Corporal (Mosteller) (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000006',
  'a0000000-0000-4000-8000-000000000002',
  'dosis-pediatrica-mosteller',
  'node',
  $title$Dosis Pediátrica por Superficie Corporal (Mosteller)$title$,
  $desc$Cálculo exacto de superficie corporal (BSA en m²) según fórmula de Mosteller, garantizando seguridad en quimioterapia y antibióticos infantiles.

Problema que resuelve: Cálculos manuales propensos a error de dosificación en pacientes pediátricos oncológicos o con fármacos de estrecho margen terapéutico.

Resultados: 100% de precisión farmacológica estandarizada bajo norma clínica, eliminando sobre o subdosificación en pacientes pediátricos.$desc$,
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
  $desc$Secuencia pedagógica de ciencia de datos escolar. Analiza medidores inteligentes de colegios, detecta consumos vampiro nocturnos con MAD y agrupa por bloques lectivos.

Problema que resuelve: Alto gasto energético por consumos fantasma nocturnos en liceos y falta de material didáctico práctico de ciencia de datos con datos reales para estudiantes.

Resultados: Detección y eliminación de 3.2 kWh nocturnos de consumo vampiro (ahorro del 18% en la factura eléctrica escolar) y 100% de estudiantes completando proyectos STEM.$desc$,
  array['educacion', 'stem', 'energia', 'colegios', 'ciencia-de-datos']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Discretiza series de tiempo en jornadas escolares oficiales para identificar consumos y patrones según actividades curriculares y recreos.

Problema que resuelve: Incompatibilidad entre registros continuos de sensores/asistencia y los bloques horarios lectivos y recreos de la jornada escolar oficial.

Resultados: Alineación automática del 100% de mediciones horarias con la malla curricular escolar, facilitando auditorías de gestión de aula.$desc$,
  array['educacion', 'horarios', 'bloques-academicos', 'analitica-escolar']::text[],
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

-- Publication 9: [NODE] Detector de Outliers MAD para Alumnos (tomas_edu)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000009',
  'a0000000-0000-4000-8000-000000000003',
  'detector-outliers-mad',
  'node',
  $title$Detector de Outliers MAD para Alumnos$title$,
  $desc$Algoritmo transparente y robusto de detección de anomalías con Median Absolute Deviation, pensado para proyectos escolares STEM.

Problema que resuelve: Distorsión estadística generada por valores atípicos extremos cuando los alumnos usan media y desviación estándar tradicional en muestras con ruido.

Resultados: Algoritmo resistente al 50% de contaminación de datos, permitiendo a escolares aislar anomalías reales sin sesgos por valores atípicos.$desc$,
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
  $desc$Inteligencia colectiva para almacenes de barrio y minimarkets: proyecta demanda de abarrotes de alta rotación, calcula puntos de reorden y consolida compras a escala directa con distribuidoras.

Problema que resuelve: Falta de poder de negociación de pequeños almaceneros frente a grandes distribuidoras y quiebres frecuentes de stock en productos básicos de alta rotación.

Resultados: 18% de ahorro en precio neto de compra por agregación de demanda colectiva y reducción del 75% en quiebres de stock en almacenes adheridos.$desc$,
  array['pymes', 'almacenes', 'compras-colectivas', 'inventario', 'abastecimiento']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Cálculo estandarizado de Reorder Point (ROP) con variabilidad de plazos de entrega y factor de seguridad para minoristas.

Problema que resuelve: Quiebres imprevistos de inventario en almacenes por no considerar la demora variable de los camiones de reparto mayorista.

Resultados: 98% de tasa de servicio y cumplimiento de pedidos sin sobreabastecer espacio físico en góndola.$desc$,
  array['pymes', 'logistica', 'inventario', 'stock-seguridad', 'reorden']::text[],
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

-- Publication 12: [NODE] Validador de Margen Neto con IVA Descontado (fran_retail)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000012',
  'a0000000-0000-4000-8000-000000000004',
  'validador-margen-neto-iva',
  'node',
  $title$Validador de Margen Neto con IVA Descontado$title$,
  $desc$Módulo SQL que limpia el IVA de los precios de venta a público y calcula el margen de contribución real por SKU.

Problema que resuelve: Confusión contable recurrente en microempresarios que calculan márgenes sobre precio bruto con IVA (19%), vendiendo a pérdida sin saberlo.

Resultados: Determinación exacta del margen de contribución real por SKU, corrigiendo precios en 14 productos que operaban con margen negativo.$desc$,
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
  $desc$Datos abiertos oficiales del Ministerio del Medio Ambiente (SINCA): agrega concentraciones horarias de MP2.5/MP10 en hexágonos Uber H3 y cruza con población vulnerable del Censo.

Problema que resuelve: Desconexión entre datos ambientales crudos de estaciones de monitoreo y la distribución territorial de adultos mayores y niños expuestos a episodios críticos de contaminación.

Resultados: Focalización de alertas preventivas y fiscalización de humos en los 5 distritos con mayor índice de calor y vulnerabilidad respiratoria.$desc$,
  array['datos-publicos', 'sinca', 'medio-ambiente', 'h3', 'chile', 'salud-publica']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Módulo de indexación geoespacial para transformar puntos en hexágonos Uber H3 a resoluciones 7, 8 o 9 sin cargar geometrías vectoriales pesadas.

Problema que resuelve: Cuellos de botella de cómputo y lentitud al realizar cruces espaciales de millones de coordenadas GPS contra geometrías poligonales pesadas.

Resultados: Consultas geoespaciales 40 veces más veloces mediante hashing discreto H3 a resolución 8, permitiendo análisis en tiempo real en el navegador.$desc$,
  array['datos-publicos', 'geoespacial', 'h3', 'uber-h3', 'gis']::text[],
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

-- Publication 15: [NODE] Índice de Calor Urbano Normalizado (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000015',
  'a0000000-0000-4000-8000-000000000005',
  'indice-calor-urbano-normalizado',
  'node',
  $title$Índice de Calor Urbano Normalizado$title$,
  $desc$Cálculo satelital del índice de isla de calor urbana (UHI) para identificar inequidad ambiental en barrios con poco arbolado urbano.

Problema que resuelve: Dificultad para cuantificar objetivamente la inequidad socioambiental en cobertura vegetal y sobrecalentamiento superficial en comunas urbanas densas.

Resultados: Mapeo de microislas de calor con resolución submunicipal, guiando planes de arborización con priorización técnica comprobable.$desc$,
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
  $desc$Supervisa cuentas por cobrar de facturación electrónica DTE, calcula intereses penales moratorios legales (Ley 18.010 y Pago a 30 Días) y proyecta liquidez a 90 días.

Problema que resuelve: Morosidad descontrolada de clientes B2B que asfixia el capital de trabajo de PYMEs y falta de aplicación oportuna de la Ley de Pago a 30 Días e intereses legales.

Resultados: Reducción del DSO (Days Sales Outstanding) de 58 a 34 días y recuperación de $2.3M CLP en intereses moratorios exigibles.$desc$,
  array['finanzas', 'flujo-de-caja', 'cobranza', 'facturacion', 'scoring-b2b']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Clasificación cuantitativa del comportamiento de pago B2B por DSO y días de mora acumulados.

Problema que resuelve: Otorgamiento ciego de crédito y plazos de pago a clientes corporativos recurrentes sin trazabilidad de su historial de morosidad.

Resultados: Clasificación automática de cartera en 3 tramos de riesgo, reduciendo incobrables en un 42%.$desc$,
  array['finanzas', 'credito', 'scoring', 'riesgo', 'clientes']::text[],
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

-- Publication 18: [NODE] Calculador de Interés Penal Diario Legal (camila_finanzas)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000018',
  'a0000000-0000-4000-8000-000000000006',
  'calculador-interes-penal-legal',
  'node',
  $title$Calculador de Interés Penal Diario Legal$title$,
  $desc$Fórmula automatizada para aplicar el interés corriente legal de la Ley 18.010 sobre deudas mercantiles vencidas.

Problema que resuelve: Complejidad y litigiosidad en el cálculo diario de intereses moratorios vigentes regulados por la CMF para facturas comerciales impagas.

Resultados: Liquidación fehaciente al centavo y en segundos con validez jurídica ante tribunales y cobranza extrajudicial.$desc$,
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
  $desc$Modela la generación diaria esperada en plantas solares fotovoltaicas del Desierto de Atacama considerando irradiancia en plano inclinado (GTI) y pérdidas por suciedad/soiling.

Problema que resuelve: Desviaciones en el despacho de energía y pérdidas de hasta un 25% por deposición de polvo desértico (soiling) no anticipado en paneles solares.

Resultados: Pronóstico de generación con 96.2% de precisión a 24 horas y optimización de ciclos de lavado robotizado con ahorro de $18.000 USD/MW.$desc$,
  array['energia', 'solar', 'fotovoltaica', 'atacama', 'irradiancia']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Generación automática del espectro elástico de aceleraciones y cálculo del esfuerzo de corte basal mínimo según la norma chilena sismorresistente NCh433 Of.96 Mod 2009.

Problema que resuelve: Horas de cálculos mecánicos manuales en planillas Excel para determinar espectros de respuesta y riesgo de errores en la verificación del corte basal normativo.

Resultados: Modelación inmediata en segundos del espectro normativo para Suelo Tipo I a IV, garantizando 100% de cumplimiento estricto con la norma NCh433.$desc$,
  array['ingenieria-civil', 'sismica', 'nch433', 'estructuras', 'chile']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Herramienta sencilla diseñada para comerciantes de barrio: compara ventas en efectivo, tarjetas Transbank y fiados, determinando las ventas mínimas para cubrir costos fijos de arriendo y luz.

Problema que resuelve: Descuadres diarios de caja al cierre nocturno, descontrol de ventas a crédito/fiado de vecinos y desconocimiento del umbral diario de facturación para cubrir costos fijos.

Resultados: Cuadre de caja exacto en menos de 5 minutos, control de $1.2M en fiados pendientes y visibilidad del punto de equilibrio diario ($180.000/día).$desc$,
  array['abarrotes', 'caja-diaria', 'punto-equilibrio', 'almacen']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Gestión integral para clínicas odontológicas: control de stock de resinas, anestubos y arcos de ortodoncia, con registro de lotes de esterilización por autoclave.

Problema que resuelve: Vencimiento inadvertido de composites y anestésicos costosos en gavetas y falta de trazabilidad ante fiscalizaciones de la SEREMI de Salud en ciclos de esterilización.

Resultados: 0 mermas por vencimiento de insumos críticos y trazabilidad 100% auditable de 450 ciclos de autoclave con registro digital de testigos biológicos.$desc$,
  array['odontologia', 'insumos-dentales', 'esterilizacion', 'clinica']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Seguimiento de producción lechera diaria por vaca en praderas del sur de Chile: proyecta curvas de lactancia Wood y detecta caídas bruscas asociadas a mastitis subclínica.

Problema que resuelve: Detección tardía de mastitis subclínica en rebaños lecheros, provocando descarte masivo de leche por antibióticos y pérdida de productividad en lactancia pico.

Resultados: Detección precoz de caídas de producción en <24 horas y reducción del 30% en pérdidas por leche descartada en sala de ordeña.$desc$,
  array['veterinaria', 'ganaderia', 'leche', 'bovinos', 'los-lagos']::text[],
  'MIT',
  '1.0.0',
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
  $desc$Segmentación ABC de más de 8.000 artículos ferreteros (fijaciones, tuberías, herramientas) por volumen monetario y rotación, automatizando pedidos de reposición quincenal.

Problema que resuelve: Capital atrapado en miles de fijaciones y accesorios de bajísima rotación mientras se producen quiebres en cemento, perfiles de acero y tuberías de alta demanda.

Resultados: Liberación de $8.500.000 CLP de capital inmovilizado y reducción de quiebres en productos Clase A del 22% al 1.8%.$desc$,
  array['ferreteria', 'inventario-abc', 'materiales', 'sku']::text[],
  'MIT',
  '1.0.0',
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

-- Publication 25: [FLOW] Controles crónicos atrasados (camila_cesfam)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000025',
  'a0000000-0000-4000-8000-000000000013',
  'controles-cronicos-atrasados',
  'flow',
  $title$Controles crónicos atrasados$title$,
  $desc$Identifica pacientes diabéticos e hipertensos que llevan más de 6 meses sin control, cruzando retiro de fármacos en farmacia con la agenda médica del CESFAM Padre Las Casas.

Problema que resuelve: Pacientes con patologías crónicas GES que retiran fármacos pero acumulan meses sin control médico ni exámenes de hemoglobina glicosilada, disparando hospitalizaciones de urgencia.

Resultados: Probada con 214 fichas clínicas; rescate y agendamiento activo del 84% de los pacientes crónicos inasistentes en menos de 3 semanas.$desc$,
  array['salud', 'cesfam', 'cronicos', 'se-trenza', 'probada-con-214-fichas']::text[],
  'MIT',
  '1.2.0',
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

-- Publication 26: [FLOW] Limpieza del censo comunal (ana_coquimbo)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000026',
  'a0000000-0000-4000-8000-000000000014',
  'limpieza-censo-comunal',
  'flow',
  $title$Limpieza del censo comunal$title$,
  $desc$Normaliza direcciones irregulares y tomas de terreno en grillas censales de Coquimbo. Fue adaptada por otros municipios; al fallar con direcciones rurales, un geógrafo la empalmó y ahora corre validada.

Problema que resuelve: Duplicidad y fallas en nomenclaturas de pasajes rurales y tomas costeras sin número oficial que distorsionaban la asignación del Fondo Común Municipal.

Resultados: Reparada y probada de nuevo tras empalme comunitario; validación limpia de 4.120 viviendas rurales no catastradas y 100% de consistencia territorial.$desc$,
  array['datos-publicos', 'censo', 'coquimbo', 'se-empalma', 'reparada-y-probada-de-nuevo']::text[],
  'MIT',
  '2.0.1',
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

-- Publication 27: [FLOW] Asistencia escolar por curso (rodrigo_ancud)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000027',
  'a0000000-0000-4000-8000-000000000015',
  'asistencia-escolar-curso',
  'flow',
  $title$Asistencia escolar por curso$title$,
  $desc$Alerta ausentismo crónico temprano correlacionando clima lluvioso y aislamiento geográfico en Ancud para activar apoyo psicosocial en 6 colegios de Chiloé.

Problema que resuelve: Detección tardía de estudiantes rurales en riesgo de deserción escolar provocada por aislamiento geográfico y temporales en el archipiélago de Chiloé.

Resultados: Probada en 6 colegios de Chiloé; reducción del 35% en deserción escolar mediante alertas tempranas a equipos de convivencia escolar y furgones municipales.$desc$,
  array['educacion', 'asistencia', 'chiloe', 'se-trenza', 'probada-en-6-colegios']::text[],
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

-- Publication 28: [FLOW] Churn mensual de suscriptores (tomas_saas)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000028',
  'a0000000-0000-4000-8000-000000000016',
  'churn-mensual-suscriptores',
  'flow',
  $title$Churn mensual de suscriptores$title$,
  $desc$Modela bajas de clientes recurrentes en Valparaíso. Una adaptación para clientes corporativos chocó con la regla de clientes personas naturales; el agente propuso un desempate que espera validación humana.

Problema que resuelve: Dificultad para diferenciar entre inactividad temporal estacional de usuarios y abandono definitivo de suscripciones de software y servicios en Valparaíso.

Resultados: Identificación del 78% de cuentas en riesgo de cancelación con 30 días de anticipación; en espera de desempate humano por colisión de reglas corporativas.$desc$,
  array['ventas', 'churn', 'saas', 'se-enreda', 'propuesta-agente-sin-revisar']::text[],
  'MIT',
  '1.1.0-conflict',
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

-- Publication 29: [FLOW] Quiebres de stock en bodega (paula_osorno)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000029',
  'a0000000-0000-4000-8000-000000000017',
  'quiebres-stock-bodega',
  'flow',
  $title$Quiebres de stock en bodega$title$,
  $desc$Diseñada para rotación de abarrotes secos en Osorno. Al probarse en una bodega frigorífica de lácteos, la fórmula de reposición falló por no considerar la caducidad corta. Espera un empalme de la comunidad.

Problema que resuelve: Quiebres no planificados en estanterías de bodega cooperativa que paralizaban despachos a almacenes rurales de la Región de Los Lagos.

Resultados: Funcionó con 95% de asertividad en abarrotes secos; trizada al probarse en cadena de frío por caducidad corta; abierta para empalme colaborativo.$desc$,
  array['ventas', 'bodega', 'mermas', 'se-triza', 'fallo-datos-otra-bodega']::text[],
  'MIT',
  '1.0.1-broken',
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
  $desc$Nodo atómico que normaliza ciclos umbral (Cq) contra genes de referencia (GAPDH/Actina) en la Universidad de Concepción. Un bloque puro esperando su primer cruce o trenzado.

Problema que resuelve: Inconsistencia en la cuantificación de expresión génica relativa por diferencias en concentración de ARN y variabilidad entre placas de termocicladores.

Resultados: Normalización matemática delta-delta-Cq de Livak 100% determinística y reproducible, sin sesgos por manipulación en hojas de cálculo.$desc$,
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
  $desc$Plantilla global de justicia climática urbana: cruza imágenes satelitales abiertas (Landsat/Sentinel) en grilla hexagonal con densidad de adultos mayores para trazar la reforestación de mayor impacto térmico (Sevilla, Phoenix, Monterrey, Santiago).

Problema que resuelve: Reforestación urbana descoordinada en metrópolis cálidas que planta árboles donde hay espacio en vez de donde el estrés térmico mata gente vulnerable.

Resultados: Priorización de corredores verdes de máximo impacto, proyectando reducción de 2.4°C en temperatura radiativa superficial en los cuadrantes más críticos.$desc$,
  array['global', 'clima', 'ciudades', 'arboles', 'islas-de-calor', 'urbanismo']::text[],
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

-- Publication 32: [APP] Optimización de Sondajes y Valor de la Información (esteban_estructuras)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000032',
  'a0000000-0000-4000-8000-000000000008',
  'sondajes-mineros-global',
  'app',
  $title$Optimización de Sondajes y Valor de la Información$title$,
  $desc$Modelo universal de decisión bayesiana: estima el volumen de recursos en 3D (minerales o agua) y computa el costo exacto de la incertidumbre para decidir la coordenada del próximo pozo con menor riesgo financiero (Nevada, Zacatecas, Mendoza, Antofagasta).

Problema que resuelve: Despilfarro de millones de dólares en perforaciones mineras o pozos de agua en zonas ciegas con bajo valor informativo o alta redundancia geológica.

Resultados: Ahorro comprobado de hasta un 32% en campañas de perforación al maximizar el valor de la información (VOI) por cada metro perforado.$desc$,
  array['global', 'geologia', 'mineria', 'agua', 'sondajes', 'bayesian']::text[],
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

-- Publication 33: [APP] Análisis Biomecánico y Cinemática Deportiva por Video (fran_retail)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000033',
  'a0000000-0000-4000-8000-000000000004',
  'biomecanica-deportiva-global',
  'app',
  $title$Análisis Biomecánico y Cinemática Deportiva por Video$title$,
  $desc$Visión computacional anclada a la física: detecta y proyecta trayectorias de atletas sobre planos métricos oficiales (pistas de 400m, velódromos o piscinas) para calcular metros de más en curvas y generar relatos sin alucinaciones.

Problema que resuelve: Alucinaciones de modelos de visión artificial estándar al estimar distancias y velocidades de atletas sin anclaje a las dimensiones reglamentarias de pistas deportivas.

Resultados: Estimación cinemática submétrica con <2 cm de error en cálculo de metros recorridos en curvas y cadencia real de zancada.$desc$,
  array['global', 'deporte', 'atletismo', 'video', 'cinematica', 'biomecanica']::text[],
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

-- Publication 34: [APP] Capacidad de Carga y Estrés de Recursos para Megaproyectos (matias_solar)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000034',
  'a0000000-0000-4000-8000-000000000007',
  'estres-recursos-global',
  'app',
  $title$Capacidad de Carga y Estrés de Recursos para Megaproyectos$title$,
  $desc$Evaluación de viabilidad socio-ambiental: proyecta el consumo masivo de agua y energía de centros de datos de IA o plantas industriales frente a la recarga ecológica de la cuenca (Querétaro, Frankfurt, Virginia, Santiago).

Problema que resuelve: Aprobación ciega o rechazo polarizado de centros de datos y plantas industriales de IA en cuencas con estrés hídrico y saturación de subestaciones eléctricas.

Resultados: Matriz de estrés hidrológico-eléctrico en tiempo real con semáforo de viabilidad ambiental objetiva y balance de compensación ecosistémica.$desc$,
  array['global', 'medio-ambiente', 'datacenters', 'agua', 'energia', 'sostenibilidad']::text[],
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

-- Publication 35: [APP] Gestión Preventiva de Drenaje e Inundaciones Pluviales (rodrigo_geodatos)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000035',
  'a0000000-0000-4000-8000-000000000005',
  'drenaje-inundaciones-global',
  'app',
  $title$Gestión Preventiva de Drenaje e Inundaciones Pluviales$title$,
  $desc$Resiliencia hidráulica urbana: cruza pronóstico pluviométrico horario con topografía y capacidad de sumideros para priorizar y despachar cuadrillas de limpieza antes de que se inunden las calles (Guayaquil, Buenos Aires, Miami, Manila).

Problema que resuelve: Reacción tardía frente a tormentas severas en ciudades con drenaje colapsado, desplegando cuadrillas de emergencia cuando las calles ya están anegadas.

Resultados: Despacho preventivo 6 horas antes del pico pluvial, reduciendo en 55% los anegamientos viales graves y cortes de tránsito en puntos críticos.$desc$,
  array['global', 'hidrologia', 'ciudades', 'drenaje', 'inundaciones', 'emergencias']::text[],
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

-- Publication 36: [APP] Sandbox de Confiabilidad y Auditoría Forense de Agentes (valencastro_md)
insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000036',
  'a0000000-0000-4000-8000-000000000002',
  'auditoria-agentes-global',
  'app',
  $title$Sandbox de Confiabilidad y Auditoría Forense de Agentes$title$,
  $desc$Caja de arena para agentes de IA autónomos: inyecta pruebas adversarias y credenciales señuelo en un entorno aislado con un testigo silencioso para contrastar lo que el agente dice contra lo que realmente hizo antes de darle permisos reales.

Problema que resuelve: Despliegue a ciegas de agentes de IA con acceso a bases de datos y herramientas sin verificar si sufren prompt injection, exfiltran datos o mienten sobre sus acciones.

Resultados: Detección del 99.4% de acciones desalineadas o llamadas a herramientas no autorizadas antes de autorizar acceso a sistemas de producción.$desc$,
  array['global', 'seguridad', 'agentes', 'sandbox', 'red-teaming', 'alineacion']::text[],
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

-- ----------------------------------------------------------------------------
-- 3. Publication Versions (Graphs, Snapshots, and Manifests)
-- ----------------------------------------------------------------------------

-- Version for cadena-frio-berries v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000001',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Cadena de Frío y Cosecha de Berries","nodes":[{"id":"telemetria_iot","type":"core.source.csv","version":"0.1.0","params":{"path":"s3://berries/telemetria.csv"},"position":{"x":0,"y":0},"label":"Sensores IoT"},{"id":"filtro_resiliente","type":"hub.agronomia.filtro-sensores","version":"0.1.0","params":{"strategy":"ignore_nulls"},"position":{"x":260,"y":0},"label":"Filtro Resiliente"},{"id":"alerta_heladas","type":"hub.agronomia.alerta-heladas","version":"0.1.0","params":{"umbral_helada":2},"position":{"x":520,"y":0},"label":"Alerta Heladas & Rocío"},{"id":"grafico_comparativo","type":"core.view.bar","version":"0.1.0","params":{"x":"zona","y":"temperatura_c","title":"Temperatura por Zona"},"position":{"x":780,"y":0},"label":"Comparativa Maule vs Michoacán"}],"edges":[{"id":"telemetria_iot_out__filtro_resiliente_in","from":{"node":"telemetria_iot","port":"out"},"to":{"node":"filtro_resiliente","port":"in"}},{"id":"filtro_resiliente_out__alerta_heladas_in","from":{"node":"filtro_resiliente","port":"out"},"to":{"node":"alerta_heladas","port":"in"}},{"id":"alerta_heladas_out__grafico_comparativo_in","from":{"node":"alerta_heladas","port":"out"},"to":{"node":"grafico_comparativo","port":"in"}}]}$flow$::jsonb,
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

-- Version for alerta-heladas-punto-rocio v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000003',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Alerta de Heladas Tardías Demo","nodes":[{"id":"n1","type":"hub.agronomia.alerta-heladas","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
  $manifest${"id":"hub.agronomia.alerta-heladas","version":"0.1.0","name":"Alerta de Heladas Tardías y Punto de Rocío","description":"Módulo compuesto que calcula el punto de rocío psicrométrico (Magnus) y emite semáforo de riesgo de helada y quiebre de frío en huertos y cámaras.","category":"Agronomía / Clima","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_helada":{"type":"number","default":2},"temp_col":{"type":"string","default":"temperatura_c"},"hum_col":{"type":"string","default":"humedad_relativa"}}},"impl":{"kind":"flow","graph":{"nodes":[{"id":"m_in","type":"flow.input","version":"0.1.0","params":{"name":"in"},"position":{"x":0,"y":0}},{"id":"m_dew","type":"hub.agronomia.calc-rocio","version":"0.1.0","params":{"a":17.27,"b":237.7},"position":{"x":260,"y":0},"label":"Magnus-Tetens"},{"id":"m_semaforo","type":"core.filter","version":"0.1.0","params":{"column":"punto_rocio_c","op":"<","value":"3.0"},"position":{"x":520,"y":0},"label":"Alerta crítica"},{"id":"m_out","type":"flow.output","version":"0.1.0","params":{"name":"out"},"position":{"x":780,"y":0}}],"edges":[{"id":"m_in_out__m_dew_in","from":{"node":"m_in","port":"out"},"to":{"node":"m_dew","port":"in"}},{"id":"m_dew_out__m_semaforo_in","from":{"node":"m_dew","port":"out"},"to":{"node":"m_semaforo","port":"in"}},{"id":"m_semaforo_out__m_out_in","from":{"node":"m_semaforo","port":"out"},"to":{"node":"m_out","port":"in"}}]}}}$manifest$::jsonb,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for scribe-clinico-soap v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000004',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Scribe Clínico & Traspaso de Guardia SOAP","nodes":[{"id":"audio_transcripcion","type":"core.source.csv","version":"0.1.0","params":{"path":"guardia_urgencias.csv"},"position":{"x":0,"y":0},"label":"Transcripción de Turno"},{"id":"evaluador_news2","type":"hub.salud.triage-news2","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Triage NEWS2"},{"id":"calculador_mosteller","type":"hub.salud.dosis-mosteller","version":"0.1.0","params":{"dosis_mg_m2":150},"position":{"x":520,"y":0},"label":"Dosis Pediátrica"},{"id":"vista_prioridad","type":"core.view.bar","version":"0.1.0","params":{"x":"cama_id","y":"news2_score","title":"Prioridad Pacientes"},"position":{"x":780,"y":0},"label":"Tablero de Urgencia"}],"edges":[{"id":"audio_transcripcion_out__evaluador_news2_in","from":{"node":"audio_transcripcion","port":"out"},"to":{"node":"evaluador_news2","port":"in"}},{"id":"evaluador_news2_out__calculador_mosteller_in","from":{"node":"evaluador_news2","port":"out"},"to":{"node":"calculador_mosteller","port":"in"}},{"id":"calculador_mosteller_out__vista_prioridad_in","from":{"node":"calculador_mosteller","port":"out"},"to":{"node":"vista_prioridad","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for triage-news2 v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000005',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Triage NEWS2 Demo","nodes":[{"id":"n1","type":"hub.salud.triage-news2","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
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

-- Version for laboratorio-escolar-electricidad v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000007',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Laboratorio Escolar de Consumo Eléctrico","nodes":[{"id":"smart_meter","type":"core.source.csv","version":"0.1.0","params":{"path":"liceo_electricidad.csv"},"position":{"x":0,"y":0},"label":"Smart Meter Escolar"},{"id":"agrupador_bloques","type":"hub.educacion.bloques-academicos","version":"0.1.0","params":{"duracion_bloque_min":45},"position":{"x":260,"y":0},"label":"Bloques Académicos"},{"id":"detector_anomalias","type":"hub.educacion.detector-mad","version":"0.1.0","params":{"umbral_mad":2.5},"position":{"x":520,"y":0},"label":"Detector MAD Alumnos"},{"id":"grafico_pedagogico","type":"core.view.bar","version":"0.1.0","params":{"x":"bloque_pedagogico","y":"kwh","title":"Consumo por Bloque"},"position":{"x":780,"y":0},"label":"Gráfico Didáctico"}],"edges":[{"id":"smart_meter_out__agrupador_bloques_in","from":{"node":"smart_meter","port":"out"},"to":{"node":"agrupador_bloques","port":"in"}},{"id":"agrupador_bloques_out__detector_anomalias_in","from":{"node":"agrupador_bloques","port":"out"},"to":{"node":"detector_anomalias","port":"in"}},{"id":"detector_anomalias_out__grafico_pedagogico_in","from":{"node":"detector_anomalias","port":"out"},"to":{"node":"grafico_pedagogico","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for agrupador-bloques-academicos v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000008',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Bloques Académicos Demo","nodes":[{"id":"n1","type":"hub.educacion.bloques-academicos","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
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

-- Version for radar-compras-agrupadas v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000010',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Radar de Demanda y Compras Agrupadas","nodes":[{"id":"pedidos_almacenes","type":"core.source.csv","version":"0.1.0","params":{"path":"pedidos_red_almacenes.csv"},"position":{"x":0,"y":0},"label":"Pedidos de Almacenes"},{"id":"validador_margen","type":"hub.pymes.margen-neto-iva","version":"0.1.0","params":{"tasa_iva":0.19},"position":{"x":260,"y":0},"label":"Márgenes sin IVA"},{"id":"reorden_logistico","type":"hub.pymes.punto-reorden","version":"0.1.0","params":{},"position":{"x":520,"y":0},"label":"Punto de Reorden"},{"id":"resumen_escala","type":"core.view.bar","version":"0.1.0","params":{"x":"producto","y":"demanda_semanal_bultos","title":"Volumen Mayorista"},"position":{"x":780,"y":0},"label":"Volumen Colectivo"}],"edges":[{"id":"pedidos_almacenes_out__validador_margen_in","from":{"node":"pedidos_almacenes","port":"out"},"to":{"node":"validador_margen","port":"in"}},{"id":"validador_margen_out__reorden_logistico_in","from":{"node":"validador_margen","port":"out"},"to":{"node":"reorden_logistico","port":"in"}},{"id":"reorden_logistico_out__resumen_escala_in","from":{"node":"reorden_logistico","port":"out"},"to":{"node":"resumen_escala","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for punto-reorden-stock-seguridad v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000011',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Punto de Reorden Demo","nodes":[{"id":"n1","type":"hub.pymes.punto-reorden","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
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

-- Version for observatorio-calidad-aire-sinca v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000013',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Observatorio Comunal de Calidad del Aire","nodes":[{"id":"feed_sinca","type":"core.source.csv","version":"0.1.0","params":{"path":"sinca_chile_estaciones.csv"},"position":{"x":0,"y":0},"label":"Red SINCA Chile"},{"id":"indexador_h3","type":"hub.datos.indexador-h3","version":"0.1.0","params":{"resolucion":8},"position":{"x":260,"y":0},"label":"Malla Uber H3"},{"id":"calor_urbano","type":"hub.datos.calor-urbano","version":"0.1.0","params":{},"position":{"x":520,"y":0},"label":"Índice Calor Urbano"},{"id":"mapa_riesgo","type":"core.view.bar","version":"0.1.0","params":{"x":"comuna","y":"mp25_ug_m3","title":"MP2.5 por Comuna"},"position":{"x":780,"y":0},"label":"Exposición Comunal"}],"edges":[{"id":"feed_sinca_out__indexador_h3_in","from":{"node":"feed_sinca","port":"out"},"to":{"node":"indexador_h3","port":"in"}},{"id":"indexador_h3_out__calor_urbano_in","from":{"node":"indexador_h3","port":"out"},"to":{"node":"calor_urbano","port":"in"}},{"id":"calor_urbano_out__mapa_riesgo_in","from":{"node":"calor_urbano","port":"out"},"to":{"node":"mapa_riesgo","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for indexador-hexagonal-h3 v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000014',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Indexador H3 Demo","nodes":[{"id":"n1","type":"hub.datos.indexador-h3","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
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

-- Version for centinela-flujo-caja v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000016',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Centinela de Flujo de Caja y Cobranza Preventiva","nodes":[{"id":"facturas_sii","type":"core.source.csv","version":"0.1.0","params":{"path":"facturas_emitidas_dte.csv"},"position":{"x":0,"y":0},"label":"DTEs Emitidos"},{"id":"scoring_cartera","type":"hub.finanzas.scoring-cumplimiento","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Scoring de Cumplimiento"},{"id":"liquidacion_intereses","type":"hub.finanzas.interes-penal","version":"0.1.0","params":{"tasa_anual_pct":28.5},"position":{"x":520,"y":0},"label":"Intereses Penales"},{"id":"curva_liquidez","type":"core.view.bar","version":"0.1.0","params":{"x":"razon_social","y":"total_exigible","title":"Recuperación por Cliente"},"position":{"x":780,"y":0},"label":"Gráfico Exigible"}],"edges":[{"id":"facturas_sii_out__scoring_cartera_in","from":{"node":"facturas_sii","port":"out"},"to":{"node":"scoring_cartera","port":"in"}},{"id":"scoring_cartera_out__liquidacion_intereses_in","from":{"node":"scoring_cartera","port":"out"},"to":{"node":"liquidacion_intereses","port":"in"}},{"id":"liquidacion_intereses_out__curva_liquidez_in","from":{"node":"liquidacion_intereses","port":"out"},"to":{"node":"curva_liquidez","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for scoring-cumplimiento-clientes v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000017',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Scoring de Cumplimiento Demo","nodes":[{"id":"n1","type":"hub.finanzas.scoring-cumplimiento","version":"0.1.0","params":{},"position":{"x":0,"y":0}}],"edges":[]}$flow$::jsonb,
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

-- Version for predictor-generacion-solar v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000019',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Predictor Solar Fotovoltaico","nodes":[{"id":"datos_piranometro","type":"core.source.csv","version":"0.1.0","params":{"path":"atacama_sol.csv"},"position":{"x":0,"y":0},"label":"Piranómetro"},{"id":"calc_gti","type":"hub.energia.gti","version":"0.1.0","params":{"tilt_deg":22},"position":{"x":260,"y":0},"label":"Irradiancia GTI"},{"id":"grafico_mwh","type":"core.view.bar","version":"0.1.0","params":{"x":"hora","y":"mwh_producidos"},"position":{"x":520,"y":0},"label":"Curva de Generación"}],"edges":[{"id":"datos_piranometro_out__calc_gti_in","from":{"node":"datos_piranometro","port":"out"},"to":{"node":"calc_gti","port":"in"}},{"id":"calc_gti_out__grafico_mwh_in","from":{"node":"calc_gti","port":"out"},"to":{"node":"grafico_mwh","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for espectro-diseno-sismico-nch433 v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000020',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Espectro Sísmico NCh433","nodes":[{"id":"parametros_suelo","type":"core.source.csv","version":"0.1.0","params":{"path":"suelo_zona.csv"},"position":{"x":0,"y":0},"label":"Suelo Tipo III / Zona 3"},{"id":"calculo_corte","type":"hub.estructuras.corte-basal","version":"0.1.0","params":{"r_factor":7},"position":{"x":260,"y":0},"label":"Cortante Basal"},{"id":"vista_espectro","type":"core.view.bar","version":"0.1.0","params":{"x":"periodo_t","y":"sa_aceleracion"},"position":{"x":520,"y":0},"label":"Espectro Sa/g"}],"edges":[{"id":"parametros_suelo_out__calculo_corte_in","from":{"node":"parametros_suelo","port":"out"},"to":{"node":"calculo_corte","port":"in"}},{"id":"calculo_corte_out__vista_espectro_in","from":{"node":"calculo_corte","port":"out"},"to":{"node":"vista_espectro","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for cuadre-caja-equilibrio-abarrotes v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000021',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Cuadre de Caja Abarrotes","nodes":[{"id":"caja_diaria","type":"core.source.csv","version":"0.1.0","params":{"path":"ventas_pos.csv"},"position":{"x":0,"y":0},"label":"Ventas Pos y Efectivo"},{"id":"resumen_caja","type":"core.view.bar","version":"0.1.0","params":{"x":"metodo_pago","y":"total"},"position":{"x":260,"y":0},"label":"Cuadre"}],"edges":[{"id":"caja_diaria_out__resumen_caja_in","from":{"node":"caja_diaria","port":"out"},"to":{"node":"resumen_caja","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for control-insumos-box-dental v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000022',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Control Box Dental","nodes":[{"id":"insumos_box","type":"core.source.csv","version":"0.1.0","params":{"path":"inventario_dental.csv"},"position":{"x":0,"y":0},"label":"Stock Box"},{"id":"filtro_caducidad","type":"core.filter","version":"0.1.0","params":{"column":"dias_para_vencer","op":"<=","value":"30"},"position":{"x":260,"y":0},"label":"Próximos a Vencer"}],"edges":[{"id":"insumos_box_out__filtro_caducidad_in","from":{"node":"insumos_box","port":"out"},"to":{"node":"filtro_caducidad","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for control-rebao-curva-lactancia v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000023',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Curva de Lactancia Lechera","nodes":[{"id":"control_lechero","type":"core.source.csv","version":"0.1.0","params":{"path":"sala_ordena.csv"},"position":{"x":0,"y":0},"label":"Sala de Ordeña"},{"id":"alerta_mastitis","type":"core.filter","version":"0.1.0","params":{"column":"celulas_somaticas","op":">","value":"250000"},"position":{"x":260,"y":0},"label":"Alerta Mastitis"}],"edges":[{"id":"control_lechero_out__alerta_mastitis_in","from":{"node":"control_lechero","port":"out"},"to":{"node":"alerta_mastitis","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for matriz-abc-inventario-ferretero v1.0.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000024',
  '1.0.0',
  $flow${"format":"nodomics/flow@0","name":"Matriz ABC Ferretera","nodes":[{"id":"articulos_sku","type":"core.source.csv","version":"0.1.0","params":{"path":"catalogo_ferretero.csv"},"position":{"x":0,"y":0},"label":"Catálogo 8000 SKUs"},{"id":"filtro_clase_a","type":"core.filter","version":"0.1.0","params":{"column":"clase_abc","op":"=","value":"A"},"position":{"x":260,"y":0},"label":"Artículos Clase A"}],"edges":[{"id":"articulos_sku_out__filtro_clase_a_in","from":{"node":"articulos_sku","port":"out"},"to":{"node":"filtro_clase_a","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for controles-cronicos-atrasados v1.2.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000025',
  '1.2.0',
  $flow${"format":"nodomics/flow@0","name":"Controles Crónicos Atrasados","nodes":[{"id":"farmacia_retiros","type":"core.source.csv","version":"0.1.0","params":{"path":"farmacia_padrelascasas.csv"},"position":{"x":0,"y":0},"label":"Farmacia CESFAM"},{"id":"agenda_medica","type":"core.source.csv","version":"0.1.0","params":{"path":"agenda_medica.csv"},"position":{"x":0,"y":180},"label":"Agenda Médica"},{"id":"filtro_inasistentes","type":"core.filter","version":"0.1.0","params":{"column":"dias_sin_control","op":">","value":"180"},"position":{"x":260,"y":90},"label":"Más de 6 Meses"},{"id":"alerta_pacientes","type":"core.view.bar","version":"0.1.0","params":{"x":"sector_cesfam","y":"total_pacientes"},"position":{"x":520,"y":90},"label":"Pacientes por Sector"}],"edges":[{"id":"farmacia_retiros_out__filtro_inasistentes_in","from":{"node":"farmacia_retiros","port":"out"},"to":{"node":"filtro_inasistentes","port":"in"}},{"id":"filtro_inasistentes_out__alerta_pacientes_in","from":{"node":"filtro_inasistentes","port":"out"},"to":{"node":"alerta_pacientes","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for limpieza-censo-comunal v2.0.1
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000026',
  '2.0.1',
  $flow${"format":"nodomics/flow@0","name":"Limpieza del Censo Comunal","nodes":[{"id":"direcciones_brutas","type":"core.source.csv","version":"0.1.0","params":{"path":"catastro_coquimbo.csv"},"position":{"x":0,"y":0},"label":"Catastro Municipal"},{"id":"normalizador_rural","type":"core.filter","version":"0.1.0","params":{"column":"tipo_calle","op":"!=","value":"SIN_NUMERO"},"position":{"x":260,"y":0},"label":"Empalme Rural"},{"id":"grilla_censal","type":"core.view.bar","version":"0.1.0","params":{"x":"distrito_censal","y":"viviendas_validadas"},"position":{"x":520,"y":0},"label":"Grilla Censal"}],"edges":[{"id":"direcciones_brutas_out__normalizador_rural_in","from":{"node":"direcciones_brutas","port":"out"},"to":{"node":"normalizador_rural","port":"in"}},{"id":"normalizador_rural_out__grilla_censal_in","from":{"node":"normalizador_rural","port":"out"},"to":{"node":"grilla_censal","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for asistencia-escolar-curso v1.3.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000027',
  '1.3.0',
  $flow${"format":"nodomics/flow@0","name":"Asistencia Escolar por Curso","nodes":[{"id":"libro_asistencia","type":"core.source.csv","version":"0.1.0","params":{"path":"asistencia_ancud.csv"},"position":{"x":0,"y":0},"label":"Libro Digital"},{"id":"alerta_ausentismo","type":"core.filter","version":"0.1.0","params":{"column":"inasistencia_pct","op":">=","value":"15"},"position":{"x":260,"y":0},"label":"Ausentismo Crónico"},{"id":"vista_cursos","type":"core.view.bar","version":"0.1.0","params":{"x":"curso","y":"alumnos_en_riesgo"},"position":{"x":520,"y":0},"label":"Riesgo por Curso"}],"edges":[{"id":"libro_asistencia_out__alerta_ausentismo_in","from":{"node":"libro_asistencia","port":"out"},"to":{"node":"alerta_ausentismo","port":"in"}},{"id":"alerta_ausentismo_out__vista_cursos_in","from":{"node":"alerta_ausentismo","port":"out"},"to":{"node":"vista_cursos","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for churn-mensual-suscriptores v1.1.0-conflict
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000028',
  '1.1.0-conflict',
  $flow${"format":"nodomics/flow@0","name":"Churn Mensual de Suscriptores","nodes":[{"id":"suscripciones_activas","type":"core.source.csv","version":"0.1.0","params":{"path":"suscripciones.csv"},"position":{"x":0,"y":0},"label":"Base Suscriptores"},{"id":"filtro_bajas","type":"core.filter","version":"0.1.0","params":{"column":"dias_sin_login","op":">=","value":"45"},"position":{"x":260,"y":0},"label":"Regla en Conflicto"},{"id":"vista_cohortes","type":"core.view.bar","version":"0.1.0","params":{"x":"cohorte","y":"tasa_churn"},"position":{"x":520,"y":0},"label":"Cohortes"}],"edges":[{"id":"suscripciones_activas_out__filtro_bajas_in","from":{"node":"suscripciones_activas","port":"out"},"to":{"node":"filtro_bajas","port":"in"}},{"id":"filtro_bajas_out__vista_cohortes_in","from":{"node":"filtro_bajas","port":"out"},"to":{"node":"vista_cohortes","port":"in"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for quiebres-stock-bodega v1.0.1-broken
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000029',
  '1.0.1-broken',
  $flow${"format":"nodomics/flow@0","name":"Quiebres de Stock en Bodega","nodes":[{"id":"inventario_bodega","type":"core.source.csv","version":"0.1.0","params":{"path":"bodega_osorno.csv"},"position":{"x":0,"y":0},"label":"Stock Bodega"},{"id":"filtro_quiebre","type":"core.filter","version":"0.1.0","params":{"column":"dias_stock","op":"<=","value":"3"},"position":{"x":260,"y":0},"label":"Fórmula Triza"},{"id":"alerta_compras","type":"core.view.bar","version":"0.1.0","params":{"x":"familia_producto","y":"quiebres"},"position":{"x":520,"y":0},"label":"Quiebres"}],"edges":[{"id":"inventario_bodega_out__filtro_quiebre_in","from":{"node":"inventario_bodega","port":"out"},"to":{"node":"filtro_quiebre","port":"in"}},{"id":"filtro_quiebre_out__alerta_compras_in","from":{"node":"filtro_quiebre","port":"out"},"to":{"node":"alerta_compras","port":"in"}}]}$flow$::jsonb,
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

-- Version for arborizacion-global v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000031',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Mitigación de Islas de Calor Global","nodes":[{"id":"in","type":"core.source.csv","version":"0.1.0","params":{"path":"urban_grid.csv"},"position":{"x":0,"y":0},"label":"Capa Satelital Abierta"},{"id":"calc","type":"hub.global.arborizacion-urbana","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Índice Urgencia Térmica"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"urgencia_termica","op":">","value":"0.7"},"position":{"x":520,"y":0},"label":"Corredor Verde Priorizado"}],"edges":[{"id":"in_out__calc_in","from":{"node":"in","port":"out"},"to":{"node":"calc","port":"in"}},{"id":"calc_out__out_in","from":{"node":"calc","port":"out"},"to":{"node":"out","port":"in"}}],"customNodes":[{"id":"hub.global.arborizacion-urbana","version":"0.1.0","name":"Mitigación de Islas de Calor y Corredores Verdes","category":"Urbanismo Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_calor_critico":{"type":"number","default":35},"peso_vulnerabilidad":{"type":"number","default":0.4}}},"impl":{"kind":"sql","template":"SELECT h3_index, lst_temp, ndvi_veg, (0.4 * lst_temp + 0.4 * (1.0 - ndvi_veg) + 0.2 * pop_vulnerable) as urgencia_termica FROM {{in}} ORDER BY urgencia_termica DESC;"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for sondajes-mineros-global v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000032',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Optimización de Sondajes Global","nodes":[{"id":"in","type":"core.source.csv","version":"0.1.0","params":{"path":"sondajes_previos.csv"},"position":{"x":0,"y":0},"label":"Muestras de Pozos"},{"id":"kriging","type":"hub.global.sondajes-optimos","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Geoestadística & Kriging"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"incertidumbre_reducida","op":">","value":"100000"},"position":{"x":520,"y":0},"label":"Próximo Sondaje Óptimo"}],"edges":[{"id":"in_out__kriging_in","from":{"node":"in","port":"out"},"to":{"node":"kriging","port":"in"}},{"id":"kriging_out__out_in","from":{"node":"kriging","port":"out"},"to":{"node":"out","port":"in"}}],"customNodes":[{"id":"hub.global.sondajes-optimos","version":"0.1.0","name":"Optimización de Sondajes y Reducción de Incertidumbre","category":"Geología Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"costo_metro_usd":{"type":"number","default":250},"metodo_estimacion":{"type":"string","default":"kriging_ordinario"}}},"impl":{"kind":"python","entry":"run_kriging_evoi","code":"def run_kriging_evoi(df, **params):\n    return df\n"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for biomecanica-deportiva-global v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000033',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Cinemática Deportiva Global","nodes":[{"id":"cam","type":"core.source.csv","version":"0.1.0","params":{"path":"tracking_video.csv"},"position":{"x":0,"y":0},"label":"Video de Carrera"},{"id":"phys","type":"hub.global.cinematica-deportiva","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Módulo Homografía & Metros Extra"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"metros_extra_curva","op":">","value":"1.0"},"position":{"x":520,"y":0},"label":"Métricas Reales Verificadas"}],"edges":[{"id":"cam_out__phys_in","from":{"node":"cam","port":"out"},"to":{"node":"phys","port":"in"}},{"id":"phys_out__out_in","from":{"node":"phys","port":"out"},"to":{"node":"out","port":"in"}}],"customNodes":[{"id":"hub.global.cinematica-deportiva","version":"0.1.0","name":"Análisis Biomecánico y Cinemática Deportiva por Video","category":"Deporte Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"longitud_pista_m":{"type":"number","default":400},"carril_referencia":{"type":"integer","default":1}}},"impl":{"kind":"python","entry":"track_and_homography","code":"def track_and_homography(df, **params):\n    return df\n"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for estres-recursos-global v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000034',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Capacidad de Carga Global","nodes":[{"id":"proy","type":"core.source.csv","version":"0.1.0","params":{"path":"data_centers_plan.csv"},"position":{"x":0,"y":0},"label":"Mega-Industrias / Data Centers"},{"id":"eval","type":"hub.global.estres-recursos-megaproyectos","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Balance Cuenca & Subestación"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"stress_pct","op":">","value":"15.0"},"position":{"x":520,"y":0},"label":"Semáforo de Viabilidad Ambiental"}],"edges":[{"id":"proy_out__eval_in","from":{"node":"proy","port":"out"},"to":{"node":"eval","port":"in"}},{"id":"eval_out__out_in","from":{"node":"eval","port":"out"},"to":{"node":"out","port":"in"}}],"customNodes":[{"id":"hub.global.estres-recursos-megaproyectos","version":"0.1.0","name":"Capacidad de Carga y Estrés Hídrico-Energético","category":"Medio Ambiente Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"limite_estres_pct":{"type":"number","default":20}}},"impl":{"kind":"sql","template":"SELECT proyecto_id, mw_demand, liters_sec_cooling, (liters_sec_cooling / cuenca_recharge_sec) * 100.0 as stress_pct FROM {{in}};"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for drenaje-inundaciones-global v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000035',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Drenaje e Inundaciones Global","nodes":[{"id":"meteo","type":"core.source.csv","version":"0.1.0","params":{"path":"radar_lluvia.csv"},"position":{"x":0,"y":0},"label":"Radar de Precipitación"},{"id":"topo","type":"hub.global.drenaje-inundaciones","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Modelo Escorrentía & Sumideros"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"accion","op":"=","value":"DESPACHAR_CUADRILLA"},"position":{"x":520,"y":0},"label":"Despacho Preventivo de Cuadrillas"}],"edges":[{"id":"meteo_out__topo_in","from":{"node":"meteo","port":"out"},"to":{"node":"topo","port":"in"}},{"id":"topo_out__out_in","from":{"node":"topo","port":"out"},"to":{"node":"out","port":"in"}}],"customNodes":[{"id":"hub.global.drenaje-inundaciones","version":"0.1.0","name":"Gestión Preventiva de Drenaje e Inundaciones Pluviales","category":"Hidrología Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"umbral_alerta_mm_hora":{"type":"number","default":20}}},"impl":{"kind":"sql","template":"SELECT sumidero_id, direccion, pendiente_deg, mm_lluvia_proyectada, CASE WHEN mm_lluvia_proyectada > 20.0 THEN 'DESPACHAR_CUADRILLA' ELSE 'NORMAL' END as accion FROM {{in}};"}}]}$flow$::jsonb,
  null,
  null,
  now()
)
on conflict (publication_id, version) do update set
  flow = excluded.flow,
  manifest = excluded.manifest;

-- Version for auditoria-agentes-global v0.1.0
insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)
values (
  'b0000000-0000-4000-8000-000000000036',
  '0.1.0',
  $flow${"format":"nodomics/flow@0","name":"Auditoría Forense de Agentes Global","nodes":[{"id":"agent","type":"core.source.csv","version":"0.1.0","params":{"path":"agent_actions.csv"},"position":{"x":0,"y":0},"label":"Agente Autónomo a Auditar"},{"id":"audit","type":"hub.global.auditoria-agentes-ia","version":"0.1.0","params":{},"position":{"x":260,"y":0},"label":"Testigo Silencioso & Comparador"},{"id":"out","type":"core.filter","version":"0.1.0","params":{"column":"desalineacion_detectada","op":"=","value":"true"},"position":{"x":520,"y":0},"label":"Certificado de Confiabilidad"}],"edges":[{"id":"agent_out__audit_in","from":{"node":"agent","port":"out"},"to":{"node":"audit","port":"in"}},{"id":"audit_out__out_in","from":{"node":"audit","port":"out"},"to":{"node":"out","port":"in"}}],"customNodes":[{"id":"hub.global.auditoria-agentes-ia","version":"0.1.0","name":"Sandbox de Confiabilidad y Auditoría Forense de Agentes","category":"Seguridad IA Global","inputs":[{"id":"in","type":"table"}],"outputs":[{"id":"out","type":"table"}],"params":{"type":"object","properties":{"nivel_aislamiento":{"type":"string","default":"estricto_read_only"}}},"impl":{"kind":"python","entry":"evaluate_agent_sandbox","code":"def evaluate_agent_sandbox(df, **params):\n    return df\n"}}]}$flow$::jsonb,
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
  $comp${"kind":"app","name":"Cadena de Frío y Cosecha de Berries (Maule 🇨🇱 vs Michoacán 🇲🇽)","slug":"cadena-frio-berries","description":"Monitoreo continuo de temperatura, humedad y punto de rocío en cámaras frigoríficas y transporte refrigerado de arándanos y frambuesas entre el Valle del Maule y Michoacán. Detecta quiebres térmicos y heladas tardías.\n\nProblema que resuelve: Pérdida crítica de fruta fresca de exportación por quiebres térmicos inadvertidos durante el transporte refrigerado Maule-Michoacán y heladas tardías que dañan la floración.\n\nResultados: Reducción del 34% en mermas por sobremaduración, detección de anomalías térmicas en <15 min y ahorro estimado de $42.000 USD por temporada.","tags":["agronomia","berries","cadena-de-frio","iot","maule","michoacan"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 1 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'filtro-sensores-resiliente',
  $comp${"kind":"node","name":"Filtro de Sensores Resiliente","slug":"filtro-sensores-resiliente","description":"Filtro tolerante a fallas para telemetría de frío. Permite ignorar nulos, imputar con cero o interpolar en series continuas (ej. [18.2, 22.1, null, 25.0]) sin quebrar el pipeline.\n\nProblema que resuelve: Telemetría IoT corrupta o intermitente en zonas rurales con caídas de señal que arroja lecturas nulas y aborta pipelines automáticos de monitoreo.\n\nResultados: 99.8% de disponibilidad de datos limpios mediante imputación e interpolación inteligente sin abortar ejecuciones de alertas.","tags":["agronomia","iot","calidad-de-datos","sensores","resiliencia"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 2 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'alerta-heladas-punto-rocio',
  $comp${"kind":"flow","name":"Alerta de Heladas Tardías y Punto de Rocío","slug":"alerta-heladas-punto-rocio","description":"Módulo compuesto para estaciones meteorológicas agrícolas. Calcula la temperatura de punto de rocío y emite semáforo de riesgo de helada por radiación y helada negra en huertos.\n\nProblema que resuelve: Incapacidad de anticipar heladas por radiación y helada negra en huertos de berries con tiempo suficiente para activar aspersores térmicos.\n\nResultados: Alerta temprana con 4 horas de anticipación basada en punto de rocío, protegiendo 120 hectáreas de cultivo en Maule.","tags":["agronomia","clima","heladas","punto-de-rocio","modulo"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 3 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'scribe-clinico-soap',
  $comp${"kind":"app","name":"Scribe Clínico & Traspaso de Guardia SOAP","slug":"scribe-clinico-soap","description":"Estructura notas de entrega de turno médico y enfermería bajo formato SOAP (Subjetivo, Objetivo, Análisis, Plan), calcula scores de deterioro fisiológico NEWS2 y valida dosis pediátricas por Mosteller.\n\nProblema que resuelve: Pérdida de información crítica y errores de comunicación en el cambio de turno en urgencias, además de demoras en dosificación pediátrica de emergencia.\n\nResultados: 45% de reducción en tiempo de traspaso de guardia, 0 errores de dosificación pediátrica por Mosteller y detección oportuna de sepsis en triage NEWS2.","tags":["salud","soap","urgencias","clinical-notes","traspaso-de-guardia"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 4 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'triage-news2',
  $comp${"kind":"flow","name":"Triage NEWS2 / Deterioro Fisiológico","slug":"triage-news2","description":"Módulo compuesto que implementa el score NEWS2 evaluando signos vitales para alertar oportunamente sobre sepsis y paro cardiorrespiratorio inminente.\n\nProblema que resuelve: Detección tardía de descompensaciones clínicas silenciosas y sepsis en salas de hospitalización general.\n\nResultados: Identificación de deterioro clínico 3 horas antes del colapso fisiológico, reduciendo traslados tardíos a UCI en un 28%.","tags":["salud","urgencias","news2","triage","fisiologia"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 5 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'dosis-pediatrica-mosteller',
  $comp${"kind":"node","name":"Dosis Pediátrica por Superficie Corporal (Mosteller)","slug":"dosis-pediatrica-mosteller","description":"Cálculo exacto de superficie corporal (BSA en m²) según fórmula de Mosteller, garantizando seguridad en quimioterapia y antibióticos infantiles.\n\nProblema que resuelve: Cálculos manuales propensos a error de dosificación en pacientes pediátricos oncológicos o con fármacos de estrecho margen terapéutico.\n\nResultados: 100% de precisión farmacológica estandarizada bajo norma clínica, eliminando sobre o subdosificación en pacientes pediátricos.","tags":["salud","pediatria","farmacologia","mosteller","dosificacion"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 6 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'laboratorio-escolar-electricidad',
  $comp${"kind":"app","name":"Laboratorio Escolar de Consumo Eléctrico","slug":"laboratorio-escolar-electricidad","description":"Secuencia pedagógica de ciencia de datos escolar. Analiza medidores inteligentes de colegios, detecta consumos vampiro nocturnos con MAD y agrupa por bloques lectivos.\n\nProblema que resuelve: Alto gasto energético por consumos fantasma nocturnos en liceos y falta de material didáctico práctico de ciencia de datos con datos reales para estudiantes.\n\nResultados: Detección y eliminación de 3.2 kWh nocturnos de consumo vampiro (ahorro del 18% en la factura eléctrica escolar) y 100% de estudiantes completando proyectos STEM.","tags":["educacion","stem","energia","colegios","ciencia-de-datos"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 7 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000003'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'agrupador-bloques-academicos',
  $comp${"kind":"flow","name":"Agrupador Temporal por Bloques Académicos (45 min vs 60 min)","slug":"agrupador-bloques-academicos","description":"Discretiza series de tiempo en jornadas escolares oficiales para identificar consumos y patrones según actividades curriculares y recreos.\n\nProblema que resuelve: Incompatibilidad entre registros continuos de sensores/asistencia y los bloques horarios lectivos y recreos de la jornada escolar oficial.\n\nResultados: Alineación automática del 100% de mediciones horarias con la malla curricular escolar, facilitando auditorías de gestión de aula.","tags":["educacion","horarios","bloques-academicos","analitica-escolar"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 8 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000003'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'detector-outliers-mad',
  $comp${"kind":"node","name":"Detector de Outliers MAD para Alumnos","slug":"detector-outliers-mad","description":"Algoritmo transparente y robusto de detección de anomalías con Median Absolute Deviation, pensado para proyectos escolares STEM.\n\nProblema que resuelve: Distorsión estadística generada por valores atípicos extremos cuando los alumnos usan media y desviación estándar tradicional en muestras con ruido.\n\nResultados: Algoritmo resistente al 50% de contaminación de datos, permitiendo a escolares aislar anomalías reales sin sesgos por valores atípicos.","tags":["educacion","estadistica","mad","outliers","didactico"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 9 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000003'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'radar-compras-agrupadas',
  $comp${"kind":"app","name":"Radar de Demanda y Compras Agrupadas para Almacenes","slug":"radar-compras-agrupadas","description":"Inteligencia colectiva para almacenes de barrio y minimarkets: proyecta demanda de abarrotes de alta rotación, calcula puntos de reorden y consolida compras a escala directa con distribuidoras.\n\nProblema que resuelve: Falta de poder de negociación de pequeños almaceneros frente a grandes distribuidoras y quiebres frecuentes de stock en productos básicos de alta rotación.\n\nResultados: 18% de ahorro en precio neto de compra por agregación de demanda colectiva y reducción del 75% en quiebres de stock en almacenes adheridos.","tags":["pymes","almacenes","compras-colectivas","inventario","abastecimiento"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 10 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'punto-reorden-stock-seguridad',
  $comp${"kind":"flow","name":"Punto de Reorden con Stock de Seguridad","slug":"punto-reorden-stock-seguridad","description":"Cálculo estandarizado de Reorder Point (ROP) con variabilidad de plazos de entrega y factor de seguridad para minoristas.\n\nProblema que resuelve: Quiebres imprevistos de inventario en almacenes por no considerar la demora variable de los camiones de reparto mayorista.\n\nResultados: 98% de tasa de servicio y cumplimiento de pedidos sin sobreabastecer espacio físico en góndola.","tags":["pymes","logistica","inventario","stock-seguridad","reorden"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 11 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'validador-margen-neto-iva',
  $comp${"kind":"node","name":"Validador de Margen Neto con IVA Descontado","slug":"validador-margen-neto-iva","description":"Módulo SQL que limpia el IVA de los precios de venta a público y calcula el margen de contribución real por SKU.\n\nProblema que resuelve: Confusión contable recurrente en microempresarios que calculan márgenes sobre precio bruto con IVA (19%), vendiendo a pérdida sin saberlo.\n\nResultados: Determinación exacta del margen de contribución real por SKU, corrigiendo precios en 14 productos que operaban con margen negativo.","tags":["pymes","precios","iva","margen","contabilidad"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 12 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'observatorio-calidad-aire-sinca',
  $comp${"kind":"app","name":"Observatorio Comunal de Calidad del Aire (SINCA Chile / Censo H3)","slug":"observatorio-calidad-aire-sinca","description":"Datos abiertos oficiales del Ministerio del Medio Ambiente (SINCA): agrega concentraciones horarias de MP2.5/MP10 en hexágonos Uber H3 y cruza con población vulnerable del Censo.\n\nProblema que resuelve: Desconexión entre datos ambientales crudos de estaciones de monitoreo y la distribución territorial de adultos mayores y niños expuestos a episodios críticos de contaminación.\n\nResultados: Focalización de alertas preventivas y fiscalización de humos en los 5 distritos con mayor índice de calor y vulnerabilidad respiratoria.","tags":["datos-publicos","sinca","medio-ambiente","h3","chile","salud-publica"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 13 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'indexador-hexagonal-h3',
  $comp${"kind":"flow","name":"Indexador Hexagonal Uber H3","slug":"indexador-hexagonal-h3","description":"Módulo de indexación geoespacial para transformar puntos en hexágonos Uber H3 a resoluciones 7, 8 o 9 sin cargar geometrías vectoriales pesadas.\n\nProblema que resuelve: Cuellos de botella de cómputo y lentitud al realizar cruces espaciales de millones de coordenadas GPS contra geometrías poligonales pesadas.\n\nResultados: Consultas geoespaciales 40 veces más veloces mediante hashing discreto H3 a resolución 8, permitiendo análisis en tiempo real en el navegador.","tags":["datos-publicos","geoespacial","h3","uber-h3","gis"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 14 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'indice-calor-urbano-normalizado',
  $comp${"kind":"node","name":"Índice de Calor Urbano Normalizado","slug":"indice-calor-urbano-normalizado","description":"Cálculo satelital del índice de isla de calor urbana (UHI) para identificar inequidad ambiental en barrios con poco arbolado urbano.\n\nProblema que resuelve: Dificultad para cuantificar objetivamente la inequidad socioambiental en cobertura vegetal y sobrecalentamiento superficial en comunas urbanas densas.\n\nResultados: Mapeo de microislas de calor con resolución submunicipal, guiando planes de arborización con priorización técnica comprobable.","tags":["datos-publicos","clima-urbano","uhi","isla-de-calor","gis"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 15 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'centinela-flujo-caja',
  $comp${"kind":"app","name":"Centinela de Flujo de Caja y Cobranza Preventiva","slug":"centinela-flujo-caja","description":"Supervisa cuentas por cobrar de facturación electrónica DTE, calcula intereses penales moratorios legales (Ley 18.010 y Pago a 30 Días) y proyecta liquidez a 90 días.\n\nProblema que resuelve: Morosidad descontrolada de clientes B2B que asfixia el capital de trabajo de PYMEs y falta de aplicación oportuna de la Ley de Pago a 30 Días e intereses legales.\n\nResultados: Reducción del DSO (Days Sales Outstanding) de 58 a 34 días y recuperación de $2.3M CLP en intereses moratorios exigibles.","tags":["finanzas","flujo-de-caja","cobranza","facturacion","scoring-b2b"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 16 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'scoring-cumplimiento-clientes',
  $comp${"kind":"flow","name":"Scoring de Cumplimiento de Clientes","slug":"scoring-cumplimiento-clientes","description":"Clasificación cuantitativa del comportamiento de pago B2B por DSO y días de mora acumulados.\n\nProblema que resuelve: Otorgamiento ciego de crédito y plazos de pago a clientes corporativos recurrentes sin trazabilidad de su historial de morosidad.\n\nResultados: Clasificación automática de cartera en 3 tramos de riesgo, reduciendo incobrables en un 42%.","tags":["finanzas","credito","scoring","riesgo","clientes"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 17 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'calculador-interes-penal-legal',
  $comp${"kind":"node","name":"Calculador de Interés Penal Diario Legal","slug":"calculador-interes-penal-legal","description":"Fórmula automatizada para aplicar el interés corriente legal de la Ley 18.010 sobre deudas mercantiles vencidas.\n\nProblema que resuelve: Complejidad y litigiosidad en el cálculo diario de intereses moratorios vigentes regulados por la CMF para facturas comerciales impagas.\n\nResultados: Liquidación fehaciente al centavo y en segundos con validez jurídica ante tribunales y cobranza extrajudicial.","tags":["finanzas","legal","interes-moratorio","ley-18010","chile"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 18 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'predictor-generacion-solar',
  $comp${"kind":"app","name":"Predictor de Generación Fotovoltaica y Degradación de Paneles","slug":"predictor-generacion-solar","description":"Modela la generación diaria esperada en plantas solares fotovoltaicas del Desierto de Atacama considerando irradiancia en plano inclinado (GTI) y pérdidas por suciedad/soiling.\n\nProblema que resuelve: Desviaciones en el despacho de energía y pérdidas de hasta un 25% por deposición de polvo desértico (soiling) no anticipado en paneles solares.\n\nResultados: Pronóstico de generación con 96.2% de precisión a 24 horas y optimización de ciclos de lavado robotizado con ahorro de $18.000 USD/MW.","tags":["energia","solar","fotovoltaica","atacama","irradiancia"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 19 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000007'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'espectro-diseno-sismico-nch433',
  $comp${"kind":"app","name":"Espectro de Diseño Sísmico NCh433 & Verificación de Deriva","slug":"espectro-diseno-sismico-nch433","description":"Generación automática del espectro elástico de aceleraciones y cálculo del esfuerzo de corte basal mínimo según la norma chilena sismorresistente NCh433 Of.96 Mod 2009.\n\nProblema que resuelve: Horas de cálculos mecánicos manuales en planillas Excel para determinar espectros de respuesta y riesgo de errores en la verificación del corte basal normativo.\n\nResultados: Modelación inmediata en segundos del espectro normativo para Suelo Tipo I a IV, garantizando 100% de cumplimiento estricto con la norma NCh433.","tags":["ingenieria-civil","sismica","nch433","estructuras","chile"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 20 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000008'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'cuadre-caja-equilibrio-abarrotes',
  $comp${"kind":"app","name":"Cuadre de Caja Diario y Punto de Equilibrio de Abarrotes","slug":"cuadre-caja-equilibrio-abarrotes","description":"Herramienta sencilla diseñada para comerciantes de barrio: compara ventas en efectivo, tarjetas Transbank y fiados, determinando las ventas mínimas para cubrir costos fijos de arriendo y luz.\n\nProblema que resuelve: Descuadres diarios de caja al cierre nocturno, descontrol de ventas a crédito/fiado de vecinos y desconocimiento del umbral diario de facturación para cubrir costos fijos.\n\nResultados: Cuadre de caja exacto en menos de 5 minutos, control de $1.2M en fiados pendientes y visibilidad del punto de equilibrio diario ($180.000/día).","tags":["abarrotes","caja-diaria","punto-equilibrio","almacen"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 21 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000009'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'control-insumos-box-dental',
  $comp${"kind":"app","name":"Control de Insumos Clínicos y Trazabilidad de Esterilización","slug":"control-insumos-box-dental","description":"Gestión integral para clínicas odontológicas: control de stock de resinas, anestubos y arcos de ortodoncia, con registro de lotes de esterilización por autoclave.\n\nProblema que resuelve: Vencimiento inadvertido de composites y anestésicos costosos en gavetas y falta de trazabilidad ante fiscalizaciones de la SEREMI de Salud en ciclos de esterilización.\n\nResultados: 0 mermas por vencimiento de insumos críticos y trazabilidad 100% auditable de 450 ciclos de autoclave con registro digital de testigos biológicos.","tags":["odontologia","insumos-dentales","esterilizacion","clinica"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 22 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000010'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'control-rebao-curva-lactancia',
  $comp${"kind":"app","name":"Monitoreo de Rebaño Lechero y Curvas de Lactancia","slug":"control-rebao-curva-lactancia","description":"Seguimiento de producción lechera diaria por vaca en praderas del sur de Chile: proyecta curvas de lactancia Wood y detecta caídas bruscas asociadas a mastitis subclínica.\n\nProblema que resuelve: Detección tardía de mastitis subclínica en rebaños lecheros, provocando descarte masivo de leche por antibióticos y pérdida de productividad en lactancia pico.\n\nResultados: Detección precoz de caídas de producción en <24 horas y reducción del 30% en pérdidas por leche descartada en sala de ordeña.","tags":["veterinaria","ganaderia","leche","bovinos","los-lagos"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 23 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000011'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'matriz-abc-inventario-ferretero',
  $comp${"kind":"app","name":"Matriz ABC y Reposición de Inventario Ferretero","slug":"matriz-abc-inventario-ferretero","description":"Segmentación ABC de más de 8.000 artículos ferreteros (fijaciones, tuberías, herramientas) por volumen monetario y rotación, automatizando pedidos de reposición quincenal.\n\nProblema que resuelve: Capital atrapado en miles de fijaciones y accesorios de bajísima rotación mientras se producen quiebres en cemento, perfiles de acero y tuberías de alta demanda.\n\nResultados: Liberación de $8.500.000 CLP de capital inmovilizado y reducción de quiebres en productos Clase A del 22% al 1.8%.","tags":["ferreteria","inventario-abc","materiales","sku"],"version":"1.0.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 24 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000012'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'controles-cronicos-atrasados',
  $comp${"kind":"flow","name":"Controles crónicos atrasados","slug":"controles-cronicos-atrasados","description":"Identifica pacientes diabéticos e hipertensos que llevan más de 6 meses sin control, cruzando retiro de fármacos en farmacia con la agenda médica del CESFAM Padre Las Casas.\n\nProblema que resuelve: Pacientes con patologías crónicas GES que retiran fármacos pero acumulan meses sin control médico ni exámenes de hemoglobina glicosilada, disparando hospitalizaciones de urgencia.\n\nResultados: Probada con 214 fichas clínicas; rescate y agendamiento activo del 84% de los pacientes crónicos inasistentes en menos de 3 semanas.","tags":["salud","cesfam","cronicos","se-trenza","probada-con-214-fichas"],"version":"1.2.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 25 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000013'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'limpieza-censo-comunal',
  $comp${"kind":"flow","name":"Limpieza del censo comunal","slug":"limpieza-censo-comunal","description":"Normaliza direcciones irregulares y tomas de terreno en grillas censales de Coquimbo. Fue adaptada por otros municipios; al fallar con direcciones rurales, un geógrafo la empalmó y ahora corre validada.\n\nProblema que resuelve: Duplicidad y fallas en nomenclaturas de pasajes rurales y tomas costeras sin número oficial que distorsionaban la asignación del Fondo Común Municipal.\n\nResultados: Reparada y probada de nuevo tras empalme comunitario; validación limpia de 4.120 viviendas rurales no catastradas y 100% de consistencia territorial.","tags":["datos-publicos","censo","coquimbo","se-empalma","reparada-y-probada-de-nuevo"],"version":"2.0.1"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 26 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000014'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'asistencia-escolar-curso',
  $comp${"kind":"flow","name":"Asistencia escolar por curso","slug":"asistencia-escolar-curso","description":"Alerta ausentismo crónico temprano correlacionando clima lluvioso y aislamiento geográfico en Ancud para activar apoyo psicosocial en 6 colegios de Chiloé.\n\nProblema que resuelve: Detección tardía de estudiantes rurales en riesgo de deserción escolar provocada por aislamiento geográfico y temporales en el archipiélago de Chiloé.\n\nResultados: Probada en 6 colegios de Chiloé; reducción del 35% en deserción escolar mediante alertas tempranas a equipos de convivencia escolar y furgones municipales.","tags":["educacion","asistencia","chiloe","se-trenza","probada-en-6-colegios"],"version":"1.3.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 27 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000015'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'churn-mensual-suscriptores',
  $comp${"kind":"flow","name":"Churn mensual de suscriptores","slug":"churn-mensual-suscriptores","description":"Modela bajas de clientes recurrentes en Valparaíso. Una adaptación para clientes corporativos chocó con la regla de clientes personas naturales; el agente propuso un desempate que espera validación humana.\n\nProblema que resuelve: Dificultad para diferenciar entre inactividad temporal estacional de usuarios y abandono definitivo de suscripciones de software y servicios en Valparaíso.\n\nResultados: Identificación del 78% de cuentas en riesgo de cancelación con 30 días de anticipación; en espera de desempate humano por colisión de reglas corporativas.","tags":["ventas","churn","saas","se-enreda","propuesta-agente-sin-revisar"],"version":"1.1.0-conflict"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 28 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000016'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'quiebres-stock-bodega',
  $comp${"kind":"flow","name":"Quiebres de stock en bodega","slug":"quiebres-stock-bodega","description":"Diseñada para rotación de abarrotes secos en Osorno. Al probarse en una bodega frigorífica de lácteos, la fórmula de reposición falló por no considerar la caducidad corta. Espera un empalme de la comunidad.\n\nProblema que resuelve: Quiebres no planificados en estanterías de bodega cooperativa que paralizaban despachos a almacenes rurales de la Región de Los Lagos.\n\nResultados: Funcionó con 95% de asertividad en abarrotes secos; trizada al probarse en cadena de frío por caducidad corta; abierta para empalme colaborativo.","tags":["ventas","bodega","mermas","se-triza","fallo-datos-otra-bodega"],"version":"1.0.1-broken"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 29 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000017'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'normalizacion-qpcr',
  $comp${"kind":"node","name":"Normalización de qPCR","slug":"normalizacion-qpcr","description":"Nodo atómico que normaliza ciclos umbral (Cq) contra genes de referencia (GAPDH/Actina) en la Universidad de Concepción. Un bloque puro esperando su primer cruce o trenzado.\n\nProblema que resuelve: Inconsistencia en la cuantificación de expresión génica relativa por diferencias en concentración de ARN y variabilidad entre placas de termocicladores.\n\nResultados: Normalización matemática delta-delta-Cq de Livak 100% determinística y reproducible, sin sesgos por manipulación en hojas de cálculo.","tags":["laboratorio","qpcr","biologia-molecular","sin-adaptar","sin-probar-fuera-laboratorio"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 30 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000018'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'arborizacion-global',
  $comp${"kind":"app","name":"Mitigación de Islas de Calor y Corredores Verdes Urbanos","slug":"arborizacion-global","description":"Plantilla global de justicia climática urbana: cruza imágenes satelitales abiertas (Landsat/Sentinel) en grilla hexagonal con densidad de adultos mayores para trazar la reforestación de mayor impacto térmico (Sevilla, Phoenix, Monterrey, Santiago).\n\nProblema que resuelve: Reforestación urbana descoordinada en metrópolis cálidas que planta árboles donde hay espacio en vez de donde el estrés térmico mata gente vulnerable.\n\nResultados: Priorización de corredores verdes de máximo impacto, proyectando reducción de 2.4°C en temperatura radiativa superficial en los cuadrantes más críticos.","tags":["global","clima","ciudades","arboles","islas-de-calor","urbanismo"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 31 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'sondajes-mineros-global',
  $comp${"kind":"app","name":"Optimización de Sondajes y Valor de la Información","slug":"sondajes-mineros-global","description":"Modelo universal de decisión bayesiana: estima el volumen de recursos en 3D (minerales o agua) y computa el costo exacto de la incertidumbre para decidir la coordenada del próximo pozo con menor riesgo financiero (Nevada, Zacatecas, Mendoza, Antofagasta).\n\nProblema que resuelve: Despilfarro de millones de dólares en perforaciones mineras o pozos de agua en zonas ciegas con bajo valor informativo o alta redundancia geológica.\n\nResultados: Ahorro comprobado de hasta un 32% en campañas de perforación al maximizar el valor de la información (VOI) por cada metro perforado.","tags":["global","geologia","mineria","agua","sondajes","bayesian"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 32 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000008'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'biomecanica-deportiva-global',
  $comp${"kind":"app","name":"Análisis Biomecánico y Cinemática Deportiva por Video","slug":"biomecanica-deportiva-global","description":"Visión computacional anclada a la física: detecta y proyecta trayectorias de atletas sobre planos métricos oficiales (pistas de 400m, velódromos o piscinas) para calcular metros de más en curvas y generar relatos sin alucinaciones.\n\nProblema que resuelve: Alucinaciones de modelos de visión artificial estándar al estimar distancias y velocidades de atletas sin anclaje a las dimensiones reglamentarias de pistas deportivas.\n\nResultados: Estimación cinemática submétrica con <2 cm de error en cálculo de metros recorridos en curvas y cadencia real de zancada.","tags":["global","deporte","atletismo","video","cinematica","biomecanica"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 33 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000004'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'estres-recursos-global',
  $comp${"kind":"app","name":"Capacidad de Carga y Estrés de Recursos para Megaproyectos","slug":"estres-recursos-global","description":"Evaluación de viabilidad socio-ambiental: proyecta el consumo masivo de agua y energía de centros de datos de IA o plantas industriales frente a la recarga ecológica de la cuenca (Querétaro, Frankfurt, Virginia, Santiago).\n\nProblema que resuelve: Aprobación ciega o rechazo polarizado de centros de datos y plantas industriales de IA en cuencas con estrés hídrico y saturación de subestaciones eléctricas.\n\nResultados: Matriz de estrés hidrológico-eléctrico en tiempo real con semáforo de viabilidad ambiental objetiva y balance de compensación ecosistémica.","tags":["global","medio-ambiente","datacenters","agua","energia","sostenibilidad"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 34 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000007'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'drenaje-inundaciones-global',
  $comp${"kind":"app","name":"Gestión Preventiva de Drenaje e Inundaciones Pluviales","slug":"drenaje-inundaciones-global","description":"Resiliencia hidráulica urbana: cruza pronóstico pluviométrico horario con topografía y capacidad de sumideros para priorizar y despachar cuadrillas de limpieza antes de que se inunden las calles (Guayaquil, Buenos Aires, Miami, Manila).\n\nProblema que resuelve: Reacción tardía frente a tormentas severas en ciudades con drenaje colapsado, desplegando cuadrillas de emergencia cuando las calles ya están anegadas.\n\nResultados: Despacho preventivo 6 horas antes del pico pluvial, reduciendo en 55% los anegamientos viales graves y cortes de tránsito en puntos críticos.","tags":["global","hidrologia","ciudades","drenaje","inundaciones","emergencias"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 35 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000005'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;

insert into public.agent_component_cards (id, card, embedding, owner_id)
values (
  'auditoria-agentes-global',
  $comp${"kind":"app","name":"Sandbox de Confiabilidad y Auditoría Forense de Agentes","slug":"auditoria-agentes-global","description":"Caja de arena para agentes de IA autónomos: inyecta pruebas adversarias y credenciales señuelo en un entorno aislado con un testigo silencioso para contrastar lo que el agente dice contra lo que realmente hizo antes de darle permisos reales.\n\nProblema que resuelve: Despliegue a ciegas de agentes de IA con acceso a bases de datos y herramientas sin verificar si sufren prompt injection, exfiltran datos o mienten sobre sus acciones.\n\nResultados: Detección del 99.4% de acciones desalineadas o llamadas a herramientas no autorizadas antes de autorizar acceso a sistemas de producción.","tags":["global","seguridad","agentes","sandbox","red-teaming","alineacion"],"version":"0.1.0"}$comp$::jsonb,
  (select ('[' || string_agg((case when n = 36 then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),
  'a0000000-0000-4000-8000-000000000002'
)
on conflict (id) do update set
  card = excluded.card,
  owner_id = excluded.owner_id;
