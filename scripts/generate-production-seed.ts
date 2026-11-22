import fs from "node:fs";
import path from "node:path";
import {
  DEMO_INITIAL_DRAFTS,
  DEMO_PROFILE_CARDS,
  DEMO_PROFILES,
} from "../packages/hub/src/testing/demo-seeds.ts";

function generateSql(): string {
  const lines: string[] = [];
  lines.push("-- ============================================================================");
  lines.push("-- MINGA PRODUCTION CATALOG SEED");
  lines.push("-- 18 Authors/Profiles across 6 Core Domains + Chilean Regional Verticals");
  lines.push("-- 36 Publications (18 Apps, 12 Flujos, 6 Nodos)");
  lines.push("-- Enriched with real-world 'Problema que resuelve' and 'Resultados'");
  lines.push("-- ============================================================================\n");

  lines.push("-- 0. Temporarily disable version advance trigger to allow idempotent bulk loading");
  lines.push("alter table public.publication_versions disable trigger before_version_insert;\n");

  // Map handles to deterministic UUIDs
  const profileIdMap = new Map<string, string>();
  DEMO_PROFILES.forEach((profile, index) => {
    const id = `a0000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`;
    profileIdMap.set(profile.handle, id);
  });

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 1. Auth Users & Profiles (18 Authors)");
  lines.push("-- ----------------------------------------------------------------------------\n");

  for (const [index, profile] of DEMO_PROFILES.entries()) {
    const userId = profileIdMap.get(profile.handle)!;
    const email = `${profile.handle}@minga.dev`;
    const meta = JSON.stringify({
      user_name: profile.handle,
      full_name: profile.displayName,
      avatar_url: profile.avatarUrl ?? `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.handle}`,
    });

    lines.push(`insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)`);
    lines.push(`values ('${userId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${email}', $meta$${meta}$meta$::jsonb, now(), now())`);
    lines.push(`on conflict (id) do nothing;\n`);

    lines.push(`insert into public.profiles (id, handle, display_name, avatar_url, created_at)`);
    lines.push(`values ('${userId}', '${profile.handle}', $dn$${profile.displayName}$dn$, '${profile.avatarUrl ?? ""}', now())`);
    lines.push(`on conflict (id) do update set`);
    lines.push(`  handle = excluded.handle,`);
    lines.push(`  display_name = excluded.display_name,`);
    lines.push(`  avatar_url = excluded.avatar_url;\n`);
  }

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 2. Publications (36 items: 18 Apps, 12 Flujos, 6 Nodos)");
  lines.push("-- ----------------------------------------------------------------------------\n");

  const pubIdMap = new Map<string, string>();

  for (const [index, { handle, draft }] of DEMO_INITIAL_DRAFTS.entries()) {
    const pubId = `b0000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`;
    pubIdMap.set(draft.slug, pubId);
    const ownerId = profileIdMap.get(handle);
    if (!ownerId) throw new Error(`Missing ownerId for handle ${handle}`);

    const tagsArray = `array[${draft.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(", ")}]::text[]`;

    lines.push(`-- Publication ${index + 1}: [${draft.kind.toUpperCase()}] ${draft.title} (${handle})`);
    lines.push(`insert into public.publications (id, owner_id, slug, kind, title, description, tags, license, latest_version, created_at, updated_at)`);
    lines.push(`values (`);
    lines.push(`  '${pubId}',`);
    lines.push(`  '${ownerId}',`);
    lines.push(`  '${draft.slug}',`);
    lines.push(`  '${draft.kind}',`);
    lines.push(`  $title$${draft.title}$title$,`);
    lines.push(`  $desc$${draft.description}$desc$,`);
    lines.push(`  ${tagsArray},`);
    lines.push(`  'MIT',`);
    lines.push(`  '${draft.version}',`);
    lines.push(`  now(),`);
    lines.push(`  now()`);
    lines.push(`)`);
    lines.push(`on conflict (owner_id, slug) do update set`);
    lines.push(`  kind = excluded.kind,`);
    lines.push(`  title = excluded.title,`);
    lines.push(`  description = excluded.description,`);
    lines.push(`  tags = excluded.tags,`);
    lines.push(`  latest_version = excluded.latest_version,\n  updated_at = now();\n`);
  }

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 3. Publication Versions (Graphs, Snapshots, and Manifests)");
  lines.push("-- ----------------------------------------------------------------------------\n");

  for (const [index, { draft }] of DEMO_INITIAL_DRAFTS.entries()) {
    const pubId = pubIdMap.get(draft.slug)!;
    const flowJson = JSON.stringify(draft.flow);
    const manifestJson = draft.manifest !== undefined ? JSON.stringify(draft.manifest) : null;

    lines.push(`-- Version for ${draft.slug} v${draft.version}`);
    lines.push(`insert into public.publication_versions (publication_id, version, flow, manifest, snapshot_path, created_at)`);
    lines.push(`values (`);
    lines.push(`  '${pubId}',`);
    lines.push(`  '${draft.version}',`);
    lines.push(`  $flow$${flowJson}$flow$::jsonb,`);
    if (manifestJson !== null) {
      lines.push(`  $manifest$${manifestJson}$manifest$::jsonb,`);
    } else {
      lines.push(`  null,`);
    }
    lines.push(`  null,`);
    lines.push(`  now()`);
    lines.push(`)`);
    lines.push(`on conflict (publication_id, version) do update set`);
    lines.push(`  flow = excluded.flow,`);
    lines.push(`  manifest = excluded.manifest;\n`);
  }

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 4. Re-enable version advance trigger");
  lines.push("-- ----------------------------------------------------------------------------\n");
  lines.push("alter table public.publication_versions enable trigger before_version_insert;\n");

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 5. Profile Cards for Match Feed (1024-dim Vector Search)");
  lines.push("-- ----------------------------------------------------------------------------\n");

  for (const [index, profile] of DEMO_PROFILES.entries()) {
    const userId = profileIdMap.get(profile.handle)!;
    const card = DEMO_PROFILE_CARDS[profile.handle];
    if (!card) continue;
    const cardJson = JSON.stringify(card);
    const axis = (index % 1024) + 1;

    lines.push(`insert into public.profile_cards (profile_id, card, schema_version, offers_embedding, content_hash, embedding_model, updated_at)`);
    lines.push(`values (`);
    lines.push(`  '${userId}',`);
    lines.push(`  $card$${cardJson}$card$::jsonb,`);
    lines.push(`  1,`);
    lines.push(`  (select ('[' || string_agg((case when n = ${axis} then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),`);
    lines.push(`  'seed-hash-${profile.handle}',`);
    lines.push(`  'voyage-code-3',`);
    lines.push(`  now()`);
    lines.push(`)`);
    lines.push(`on conflict (profile_id) do update set`);
    lines.push(`  card = excluded.card,`);
    lines.push(`  updated_at = now();\n`);
  }

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 6. Component Cards for Match Feed (36 Components)");
  lines.push("-- ----------------------------------------------------------------------------\n");

  for (const [index, { handle, draft }] of DEMO_INITIAL_DRAFTS.entries()) {
    const ownerId = profileIdMap.get(handle)!;
    const axis = (index % 1024) + 1;
    const compCard = JSON.stringify({
      kind: draft.kind,
      name: draft.title,
      slug: draft.slug,
      description: draft.description,
      tags: draft.tags,
      version: draft.version,
    });

    lines.push(`insert into public.agent_component_cards (id, card, embedding, owner_id)`);
    lines.push(`values (`);
    lines.push(`  '${draft.slug}',`);
    lines.push(`  $comp$${compCard}$comp$::jsonb,`);
    lines.push(`  (select ('[' || string_agg((case when n = ${axis} then 1 else 0 end)::text, ',' order by n) || ']')::extensions.vector from generate_series(1, 1024) as n),`);
    lines.push(`  '${ownerId}'`);
    lines.push(`)`);
    lines.push(`on conflict (id) do update set`);
    lines.push(`  card = excluded.card,\n  owner_id = excluded.owner_id;\n`);
  }

  return lines.join("\n");
}

const sql = generateSql();

const migrationPath = path.resolve(import.meta.dirname, "../supabase/migrations/20261122071000_seed_production_catalog.sql");
const seedPath = path.resolve(import.meta.dirname, "../supabase/seed.sql");

fs.writeFileSync(migrationPath, sql, "utf-8");
fs.writeFileSync(seedPath, sql, "utf-8");

console.log(`Generated migration: ${migrationPath} (${(sql.length / 1024).toFixed(1)} KB)`);
console.log(`Generated seed: ${seedPath} (${(sql.length / 1024).toFixed(1)} KB)`);
