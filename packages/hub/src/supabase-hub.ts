import { err, ok } from "@nodomics/protocol";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import type {
  Hub,
  HubError,
  HubProfile,
  HubResult,
  PublicationDetail,
  PublicationDraft,
  PublicationSummary,
  SearchQuery,
  SignInMethod,
} from "./hub.ts";
import { toProfile, toSummaries, toVersion, toVersionSummaries } from "./hub-rows.ts";
import { parseSnapshot, type Snapshot } from "./snapshot.ts";
import type { FlowStore } from "./flow-store.ts";
import { createSupabaseFlowStore } from "./supabase-flow-store.ts";
import { isNewerVersion } from "./versions.ts";

/** Untyped on purpose: every row is parsed at the boundary (hub-rows.ts). */
export const createHubClient = (url: string, publishableKey: string) =>
  createClient(url, publishableKey);
export type HubClient = ReturnType<typeof createHubClient>;

const PUBLICATIONS_VIEW = "hub_publications";
const SNAPSHOT_BUCKET = "snapshots";
/** The bucket's own limit (migration 20261121120000); checked first to give a clear error. */
const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;
const MAX_SEARCH_RESULTS = 60;
// Postgres error codes the hub's rules raise (see supabase/migrations).
const CHECK_VIOLATION = "23514";
const INSUFFICIENT_PRIVILEGE = "42501";

export type SupabaseHubOptions = {
  readonly url: string;
  readonly publishableKey: string;
  /** Where sign-in links and providers send the user back to. */
  readonly redirectTo: () => string;
};

/** The hub on Supabase: Auth, Postgres with row level security and Storage (ADR 0018). */
export const createSupabaseHub = (options: SupabaseHubOptions): Hub & FlowStore =>
  createHubOnClient(createHubClient(options.url, options.publishableKey), options.redirectTo);

/** The same hub on a client created elsewhere, e.g. one already signed in by a script. */
export function createHubOnClient(client: HubClient, redirectTo: () => string): Hub & FlowStore {
  return {
    ...createSupabaseFlowStore(client),
    currentProfile: () => currentProfile(client),
    onProfileChange: (listener) => {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        // Supabase forbids awaiting its own calls inside this callback, hence the deferral.
        setTimeout(() => {
          void (
            session === null ? Promise.resolve(undefined) : profileById(client, session.user.id)
          ).then(listener);
        }, 0);
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },
    signIn: (method) => signIn(client, method, redirectTo()),
    signOut: async () => {
      await client.auth.signOut();
    },
    profile: async (handle) => {
      const { data, error }: SingleRow = await client
        .from("profiles")
        .select()
        .eq("handle", handle)
        .maybeSingle();
      if (error !== null) return err(fromPostgrest(error));
      return data === null ? ok(undefined) : toProfile(data);
    },
    search: (query) => search(client, query),
    publicationsOf: async (handle) =>
      summaries(
        await client
          .from(PUBLICATIONS_VIEW)
          .select()
          .eq("owner_handle", handle)
          .order("updated_at", { ascending: false }),
      ),
    publication: (handle, slug) => publication(client, { handle, slug }),
    version: (publicationId, version) => publishedVersion(client, { publicationId, version }),
    ownPublication: async (slug) => {
      const profile = await currentProfile(client);
      if (profile === undefined) return err({ kind: "signed-out" });
      return firstSummary(
        await client
          .from(PUBLICATIONS_VIEW)
          .select()
          .eq("owner_handle", profile.handle)
          .eq("slug", slug),
      );
    },
    publish: (draft) => publish(client, draft),
  };
}

async function currentProfile(client: HubClient): Promise<HubProfile | undefined> {
  const { data } = await client.auth.getSession();
  return data.session === null ? undefined : profileById(client, data.session.user.id);
}

async function profileById(client: HubClient, id: string): Promise<HubProfile | undefined> {
  const { data }: SingleRow = await client.from("profiles").select().eq("id", id).maybeSingle();
  const profile = data === null ? undefined : toProfile(data);
  return profile?.ok === true ? profile.value : undefined;
}

async function signIn(
  client: HubClient,
  method: SignInMethod,
  redirectTo: string,
): Promise<HubResult<void>> {
  const { error } =
    method.kind === "email"
      ? await client.auth.signInWithOtp({
          email: method.email,
          options: { emailRedirectTo: redirectTo },
        })
      : await client.auth.signInWithOAuth({ provider: method.provider, options: { redirectTo } });
  return error === null ? ok(undefined) : err({ kind: "unavailable", detail: error.message });
}

async function search(client: HubClient, { text, kind }: SearchQuery) {
  const term = (text ?? "").trim().replace(/[%,()]/gu, " ");
  const base = client.from(PUBLICATIONS_VIEW).select();
  const byKind = kind === undefined ? base : base.eq("kind", kind);
  const byText =
    term === ""
      ? byKind
      : byKind.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,owner_handle.ilike.%${term}%,tags.cs.{${term.toLowerCase()}}`,
        );
  return summaries(
    await byText.order("updated_at", { ascending: false }).limit(MAX_SEARCH_RESULTS),
  );
}

async function publication(
  client: HubClient,
  { handle, slug }: { readonly handle: string; readonly slug: string },
): Promise<HubResult<PublicationDetail | undefined>> {
  const found = firstSummary(
    await client.from(PUBLICATIONS_VIEW).select().eq("owner_handle", handle).eq("slug", slug),
  );
  if (!found.ok) return found;
  if (found.value === undefined) return ok(undefined);
  const { data, error } = await client
    .from("publication_versions")
    .select("version, created_at, has_state")
    .eq("publication_id", found.value.id);
  if (error !== null) return err(fromPostgrest(error));
  const versions = toVersionSummaries(data);
  return versions.ok ? ok({ ...found.value, versions: versions.value }) : versions;
}

async function publishedVersion(
  client: HubClient,
  { publicationId, version }: { readonly publicationId: string; readonly version: string },
) {
  const { data, error } = await client
    .from("publication_versions")
    .select("version, created_at, flow, manifest, snapshot_path")
    .eq("publication_id", publicationId)
    .eq("version", version)
    .single();
  if (error !== null) return err(fromPostgrest(error));
  const parsed = toVersion(data);
  if (!parsed.ok) return parsed;
  const snapshot = await downloadSnapshot(client, snapshotPathOf(data));
  return ok({ ...parsed.value, ...(snapshot === undefined ? {} : { snapshot }) });
}

const snapshotPathOf = (row: unknown): string | undefined =>
  typeof row === "object" &&
  row !== null &&
  "snapshot_path" in row &&
  typeof row.snapshot_path === "string"
    ? row.snapshot_path
    : undefined;

/** A missing or unreadable snapshot only costs the preview its data; the flow still opens. */
async function downloadSnapshot(
  client: HubClient,
  path: string | undefined,
): Promise<Snapshot | undefined> {
  if (path === undefined) return undefined;
  const { data } = await client.storage.from(SNAPSHOT_BUCKET).download(path);
  if (data === null) return undefined;
  const parsed = parseSnapshot(JSON.parse(await data.text()));
  return parsed.ok ? parsed.value : undefined;
}

async function publish(
  client: HubClient,
  draft: PublicationDraft,
): Promise<HubResult<PublicationSummary>> {
  const snapshot = new Blob([JSON.stringify(draft.snapshot)], { type: "application/json" });
  if (snapshot.size > MAX_SNAPSHOT_BYTES) return err({ kind: "too-large" });
  const target = await upsertPublication(client, draft);
  if (!target.ok) return target;
  const path = `${target.value.id}/${draft.version}.json`;
  const uploaded = await client.storage
    .from(SNAPSHOT_BUCKET)
    .upload(path, snapshot, { upsert: false });
  if (uploaded.error !== null) return err({ kind: "unavailable", detail: uploaded.error.message });
  const { error } = await client.from("publication_versions").insert({
    publication_id: target.value.id,
    version: draft.version,
    flow: draft.flow,
    manifest: draft.manifest ?? null,
    snapshot_path: path,
    has_state: draft.snapshot.state !== undefined,
  });
  if (error !== null) return err(fromPostgrest(error));
  return ok({ ...target.value, latestVersion: draft.version });
}

/** The author's publication with this slug, created or updated to the draft's description. */
async function upsertPublication(
  client: HubClient,
  draft: PublicationDraft,
): Promise<HubResult<PublicationSummary>> {
  const profile = await currentProfile(client);
  if (profile === undefined) return err({ kind: "signed-out" });
  const existing = firstSummary(
    await client
      .from(PUBLICATIONS_VIEW)
      .select()
      .eq("owner_handle", profile.handle)
      .eq("slug", draft.slug),
  );
  if (!existing.ok) return existing;
  if (existing.value !== undefined && existing.value.kind !== draft.kind)
    return err({ kind: "kind-mismatch" });
  if (!isNewerVersion(draft.version, existing.value?.latestVersion))
    return err({ kind: "stale-version" });
  const fields = { title: draft.title, description: draft.description, tags: [...draft.tags] };
  const { error } =
    existing.value === undefined
      ? await client.from("publications").insert({ ...fields, slug: draft.slug, kind: draft.kind })
      : await client.from("publications").update(fields).eq("id", existing.value.id);
  if (error !== null) return err(fromPostgrest(error));
  const saved = firstSummary(
    await client
      .from(PUBLICATIONS_VIEW)
      .select()
      .eq("owner_handle", profile.handle)
      .eq("slug", draft.slug),
  );
  if (!saved.ok) return saved;
  return saved.value === undefined ? err({ kind: "unavailable" }) : ok(saved.value);
}

type SingleRow = { readonly data: unknown; readonly error: PostgrestError | null };
type Rows = { readonly data: unknown[] | null; readonly error: PostgrestError | null };

function summaries({ data, error }: Rows): HubResult<ReadonlyArray<PublicationSummary>> {
  return error === null ? toSummaries(data ?? []) : err(fromPostgrest(error));
}

function firstSummary(rows: Rows): HubResult<PublicationSummary | undefined> {
  const found = summaries(rows);
  return found.ok ? ok(found.value[0]) : found;
}

export function fromPostgrest(error: PostgrestError): HubError {
  switch (error.code) {
    case CHECK_VIOLATION:
      return { kind: "stale-version", detail: error.message };
    case INSUFFICIENT_PRIVILEGE:
      return { kind: "signed-out", detail: error.message };
    default:
      return { kind: "unavailable", detail: error.message };
  }
}
