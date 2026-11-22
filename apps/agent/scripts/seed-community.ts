/**
 * Loads the community seeds (profiles, collaboration cards and published flows/nodes) into the production
 * Supabase project, so they become the hub's base templates. Idempotent: rerunning updates rows in place
 * and skips versions that already exist.
 *
 *   set -a; . ~/.config/minga/supabase.env; . ~/.config/minga/voyage.env; set +a
 *   node apps/agent/scripts/seed-community.ts --dry-run   # validate and print the plan, no writes
 *   node apps/agent/scripts/seed-community.ts             # write to SUPABASE_URL
 *
 * Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and VOYAGE_API_KEY (the last two only without --dry-run).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_INITIAL_DRAFTS,
  DEMO_PROFILE_CARDS,
  DEMO_PROFILES,
} from "../../web/src/demo/demo-seeds.ts";
import { createSupabaseFeedStore } from "../src/feed/supabase-feed-store.ts";
import { FEED_EMBEDDING_MODEL, saveProfile } from "../src/feed/feed-service.ts";
import { createVoyageEmbeddings } from "../src/memory/embeddings.ts";

type HubProfile = (typeof DEMO_PROFILES)[number];
type SeedDraft = (typeof DEMO_INITIAL_DRAFTS)[number]["draft"];

const HANDLE_MAX = 20;
const SLUG_MAX = 30;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 2000;
const SNAPSHOT_BUCKET = "snapshots";
const SEED_EMAIL_DOMAIN = "example.com";
const USERS_PAGE_SIZE = 1000;

/** The database accepts `^[a-z0-9-]{3,20}$`; the seeds use underscores. */
const toDbHandle = (handle: string): string =>
  handle
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, HANDLE_MAX)
    .replace(/-+$/, "");

/** The database accepts `^[a-z0-9-]{1,30}$`; long slugs are cut at the last whole word. */
const toDbSlug = (slug: string): string =>
  slug.length <= SLUG_MAX ? slug : slug.slice(0, slug.lastIndexOf("-", SLUG_MAX));

const seedEmail = (handle: string): string => `minga-seed+${handle}@${SEED_EMAIL_DOMAIN}`;

type Plan = {
  readonly profiles: ReadonlyArray<{ readonly seed: HubProfile; readonly handle: string }>;
  readonly publications: ReadonlyArray<{ readonly handle: string; readonly draft: SeedDraft }>;
  readonly problems: ReadonlyArray<string>;
};

function buildPlan(): Plan {
  const profiles = DEMO_PROFILES.map((seed) => ({ seed, handle: toDbHandle(seed.handle) }));
  const handleOf = new Map(DEMO_PROFILES.map((p) => [p.handle, toDbHandle(p.handle)]));
  const publications = DEMO_INITIAL_DRAFTS.flatMap(({ handle, draft }) => {
    const owner = handleOf.get(handle);
    return owner === undefined ? [] : [{ handle: owner, draft: normalizeDraft(draft) }];
  });
  return { profiles, publications, problems: findProblems(profiles, publications) };
}

const normalizeDraft = (draft: SeedDraft): SeedDraft => ({
  ...draft,
  slug: toDbSlug(draft.slug),
  title: draft.title.slice(0, TITLE_MAX),
  description: draft.description.slice(0, DESCRIPTION_MAX),
});

const duplicates = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  values.filter((value, index) => values.indexOf(value) !== index);

function findProblems(
  profiles: Plan["profiles"],
  publications: Plan["publications"],
): ReadonlyArray<string> {
  const handles = profiles.map((p) => p.handle);
  const keys = publications.map((p) => `${p.handle}/${p.draft.slug}`);
  const orphans = DEMO_INITIAL_DRAFTS.filter(
    ({ handle }) => !DEMO_PROFILES.some((p) => p.handle === handle),
  ).map(({ handle, draft }) => `${handle}/${draft.slug}`);
  return [
    ...duplicates(handles).map((h) => `handle repetido: ${h}`),
    ...duplicates(keys).map((k) => `slug repetido: ${k}`),
    ...handles.filter((h) => h.length < 3).map((h) => `handle muy corto: ${h}`),
    ...orphans.map((k) => `publicación sin perfil: ${k}`),
  ];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`Falta la variable ${name}`);
  return value;
}

async function findUserId(client: SupabaseClient, email: string): Promise<string | undefined> {
  const { data, error } = await client.auth.admin.listUsers({ perPage: USERS_PAGE_SIZE });
  if (error !== null) throw new Error(`No pude listar usuarios: ${error.message}`);
  return data.users.find((user) => user.email === email)?.id;
}

async function ensureUser(
  client: SupabaseClient,
  seed: HubProfile,
  handle: string,
): Promise<string> {
  const email = seedEmail(handle);
  const existing = await findUserId(client, email);
  if (existing !== undefined) return existing;
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: seed.displayName, seed: "community" },
  });
  if (error !== null) throw new Error(`No pude crear el usuario ${handle}: ${error.message}`);
  return data.user.id;
}

async function ensureProfile(
  client: SupabaseClient,
  seed: HubProfile,
  handle: string,
): Promise<string> {
  const id = await ensureUser(client, seed, handle);
  const { error } = await client
    .from("profiles")
    .update({ handle, display_name: seed.displayName })
    .eq("id", id);
  if (error !== null) throw new Error(`No pude actualizar el perfil ${handle}: ${error.message}`);
  return id;
}

async function ensurePublication(
  client: SupabaseClient,
  ownerId: string,
  draft: SeedDraft,
): Promise<string> {
  const fields = {
    owner_id: ownerId,
    slug: draft.slug,
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    tags: [...draft.tags],
  };
  const { data, error } = await client
    .from("publications")
    .upsert(fields, { onConflict: "owner_id,slug" })
    .select("id")
    .single<{ id: string }>();
  if (error !== null) throw new Error(`No pude guardar ${draft.slug}: ${error.message}`);
  return data.id;
}

async function versionExists(
  client: SupabaseClient,
  publicationId: string,
  draft: SeedDraft,
): Promise<boolean> {
  const { data, error } = await client
    .from("publication_versions")
    .select("version")
    .eq("publication_id", publicationId)
    .eq("version", draft.version)
    .maybeSingle();
  if (error !== null) throw new Error(`No pude leer versiones de ${draft.slug}: ${error.message}`);
  return data !== null;
}

async function ensureVersion(
  client: SupabaseClient,
  publicationId: string,
  draft: SeedDraft,
): Promise<"creada" | "ya existía"> {
  if (await versionExists(client, publicationId, draft)) return "ya existía";
  const path = `${publicationId}/${draft.version}.json`;
  const snapshot = new Blob([JSON.stringify(draft.snapshot)], { type: "application/json" });
  const uploaded = await client.storage
    .from(SNAPSHOT_BUCKET)
    .upload(path, snapshot, { upsert: true });
  if (uploaded.error !== null)
    throw new Error(`No pude subir el snapshot de ${draft.slug}: ${uploaded.error.message}`);
  const { error } = await client.from("publication_versions").insert({
    publication_id: publicationId,
    version: draft.version,
    flow: draft.flow,
    manifest: draft.manifest ?? null,
    snapshot_path: path,
    has_state: draft.snapshot.state !== undefined,
  });
  if (error !== null)
    throw new Error(`No pude guardar la versión de ${draft.slug}: ${error.message}`);
  return "creada";
}

async function seedCard(
  client: SupabaseClient,
  profileId: string,
  seedHandle: string,
): Promise<string> {
  const card = DEMO_PROFILE_CARDS[seedHandle];
  if (card === undefined) return "sin tarjeta";
  const embeddings = createVoyageEmbeddings({
    apiKey: requireEnv("VOYAGE_API_KEY"),
    model: FEED_EMBEDDING_MODEL,
    inputType: "document",
    fetch,
  });
  const deps = {
    store: createSupabaseFeedStore(client),
    documentEmbeddings: embeddings,
    queryEmbeddings: embeddings,
  };
  const saved = await saveProfile(deps, profileId, card);
  if (!saved.ok)
    throw new Error(`No pude guardar la tarjeta de ${seedHandle}: ${JSON.stringify(saved.error)}`);
  return "tarjeta guardada";
}

const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};
const fail = (line: string): void => {
  process.stderr.write(`${line}\n`);
};

function printPlan(plan: Plan): void {
  say(`Perfiles: ${String(plan.profiles.length)}`);
  for (const { seed, handle } of plan.profiles)
    say(`  ${seed.handle} -> ${handle}  (${seed.displayName})`);
  say(`Publicaciones: ${String(plan.publications.length)}`);
  for (const { handle, draft } of plan.publications)
    say(`  ${handle}/${draft.slug}@${draft.version}  [${draft.kind}] ${draft.title}`);
  const cards = plan.profiles.filter((p) => DEMO_PROFILE_CARDS[p.seed.handle] !== undefined);
  say(`Tarjetas de colaboración: ${String(cards.length)}`);
}

async function run(plan: Plan): Promise<void> {
  const client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ids = new Map<string, string>();
  for (const { seed, handle } of plan.profiles) {
    const id = await ensureProfile(client, seed, handle);
    ids.set(handle, id);
    say(`perfil ${handle}: ${await seedCard(client, id, seed.handle)}`);
  }
  for (const { handle, draft } of plan.publications) {
    const ownerId = ids.get(handle);
    if (ownerId === undefined) throw new Error(`Sin dueño para ${handle}/${draft.slug}`);
    const publicationId = await ensurePublication(client, ownerId, draft);
    const result = await ensureVersion(client, publicationId, draft);
    say(`publicación ${handle}/${draft.slug}@${draft.version}: ${result}`);
  }
}

async function main(): Promise<void> {
  const plan = buildPlan();
  printPlan(plan);
  if (plan.problems.length > 0) {
    fail(`Problemas en las semillas:\n  ${plan.problems.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--dry-run")) {
    say("Dry run: no se escribió nada.");
    return;
  }
  await run(plan);
  say("Listo.");
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
