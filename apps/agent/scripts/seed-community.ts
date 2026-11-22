/**
 * Loads the community seeds (profiles, collaboration cards and published flows/nodes) into the production
 * Supabase project, so they become the hub's base templates. Idempotent: rerunning updates rows in place
 * and skips versions that already exist.
 *
 *   set -a; . ~/.config/minga/supabase.env; . ~/.config/minga/voyage.env; set +a
 *   node apps/agent/scripts/seed-community.ts --dry-run   # validate and print the plan, no writes
 *   node apps/agent/scripts/seed-community.ts             # write to SUPABASE_URL
 *
 * Needs SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and VOYAGE_API_KEY (all but the first
 * only without --dry-run). The service role only manages accounts: every row is written as its owner,
 * through the hub and row level security, like the interface does.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createHubClient,
  createHubOnClient,
  type HubClient,
} from "../../../packages/hub/src/index.ts";
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
const SEED_EMAIL_DOMAIN = "example.com";
const USERS_PAGE_SIZE = 1000;
const EMBEDDING_ATTEMPTS = 5;
const EMBEDDING_RETRY_MS = 25_000;

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
  admin: SupabaseClient,
  seed: HubProfile,
  handle: string,
): Promise<string> {
  const email = seedEmail(handle);
  const existing = await findUserId(admin, email);
  if (existing !== undefined) return email;
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: seed.displayName, seed: "community" },
  });
  if (error !== null) throw new Error(`No pude crear el usuario ${handle}: ${error.message}`);
  return email;
}

/** A magic link generated by the admin API sends no email; verifying it opens the user's session. */
async function signInAs(admin: SupabaseClient, email: string): Promise<HubClient> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error !== null) throw new Error(`No pude generar el acceso de ${email}: ${error.message}`);
  const client = createHubClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"));
  const verified = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verified.error !== null || verified.data.user === null)
    throw new Error(
      `No pude abrir la sesión de ${email}: ${verified.error?.message ?? "sin usuario"}`,
    );
  return client;
}

async function renameProfile(
  client: HubClient,
  { id, handle, displayName }: { id: string; handle: string; displayName: string },
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ handle, display_name: displayName })
    .eq("id", id);
  if (error !== null) throw new Error(`No pude actualizar el perfil ${handle}: ${error.message}`);
}

async function refreshDescription(
  client: HubClient,
  ownerId: string,
  draft: SeedDraft,
): Promise<void> {
  const { error } = await client
    .from("publications")
    .update({ title: draft.title, description: draft.description, tags: [...draft.tags] })
    .eq("owner_id", ownerId)
    .eq("slug", draft.slug);
  if (error !== null) throw new Error(`No pude actualizar ${draft.slug}: ${error.message}`);
}

/** The hub never changes a publication's kind, so a seed that became an app or a flow is published anew. */
async function removePublication(client: HubClient, ownerId: string, slug: string): Promise<void> {
  const { error } = await client
    .from("publications")
    .delete()
    .eq("owner_id", ownerId)
    .eq("slug", slug);
  if (error !== null) throw new Error(`No pude borrar ${slug}: ${error.message}`);
}

async function publishDraft(client: HubClient, ownerId: string, draft: SeedDraft): Promise<string> {
  const hub = createHubOnClient(client, () => "");
  const published = await hub.publish(draft);
  if (published.ok) return "publicada";
  if (published.error.kind === "kind-mismatch") {
    await removePublication(client, ownerId, draft.slug);
    const republished = await hub.publish(draft);
    if (republished.ok) return `publicada de nuevo como ${draft.kind}`;
    throw new Error(`No pude republicar ${draft.slug}: ${JSON.stringify(republished.error)}`);
  }
  if (published.error.kind !== "stale-version")
    throw new Error(`No pude publicar ${draft.slug}: ${JSON.stringify(published.error)}`);
  await refreshDescription(client, ownerId, draft);
  return "ya existía, descripción actualizada";
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Voyage rate-limits by the minute; waiting and retrying is enough for a one-off load. */
async function withRetries<T extends { readonly ok: boolean }>(
  attempt: () => Promise<T>,
): Promise<T> {
  const result = await attempt();
  for (let tries = 1; !result.ok && tries < EMBEDDING_ATTEMPTS; tries += 1) {
    await wait(EMBEDDING_RETRY_MS);
    const retried = await attempt();
    if (retried.ok) return retried;
  }
  return result;
}

async function seedCard(client: HubClient, profileId: string, seedHandle: string): Promise<string> {
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
  const saved = await withRetries(() => saveProfile(deps, profileId, card));
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

async function seedProfile(admin: SupabaseClient, seed: HubProfile, handle: string): Promise<void> {
  const client = await signInAs(admin, await ensureUser(admin, seed, handle));
  const { data } = await client.auth.getUser();
  if (data.user === null) throw new Error(`Sin sesión para ${handle}`);
  const id = data.user.id;
  await renameProfile(client, { id, handle, displayName: seed.displayName });
  say(`perfil ${handle}: ${await seedCard(client, id, seed.handle)}`);
  for (const { draft } of DEMO_INITIAL_DRAFTS.filter((entry) => entry.handle === seed.handle)) {
    const normalized = normalizeDraft(draft);
    say(
      `  ${normalized.slug}@${normalized.version}: ${await publishDraft(client, id, normalized)}`,
    );
  }
  await client.auth.signOut();
}

async function run(plan: Plan): Promise<void> {
  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const { seed, handle } of plan.profiles) await seedProfile(admin, seed, handle);
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
