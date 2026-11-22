import { err, ok } from "@nodomics/protocol";
import type {
  Hub,
  HubProfile,
  PublicationDetail,
  PublicationDraft,
  PublicationSummary,
  PublishedVersion,
  SearchQuery,
  SignInMethod,
} from "./hub.ts";
import type { FlowStore } from "./flow-store.ts";
import type { SessionToken } from "./session-token.ts";
import { createMemoryFlowStore } from "./memory-flow-store.ts";
import { isNewerVersion } from "./versions.ts";

type StoredPublication = Omit<PublicationSummary, "owner"> & {
  readonly ownerId: string;
  readonly versions: ReadonlyArray<PublishedVersion>;
};

export type MemoryHubOptions = {
  readonly profiles: ReadonlyArray<HubProfile>;
  readonly now: () => string;
  readonly initialDrafts?: ReadonlyArray<{
    readonly handle: string;
    readonly draft: PublicationDraft;
  }>;
};

/**
 * A hub that lives in memory, for tests and for running the interface without Supabase. Signing
 * in by email picks the profile whose handle is the email; a provider picks the first profile.
 */
export function createMemoryHub({
  profiles,
  now,
  initialDrafts,
}: MemoryHubOptions): Hub & FlowStore & SessionToken {
  const state = {
    current: undefined as HubProfile | undefined,
    publications: [] as StoredPublication[],
  };
  if (initialDrafts !== undefined) {
    for (const { handle, draft } of initialDrafts) {
      const owner = profiles.find((profile) => profile.handle === handle);
      if (owner !== undefined) {
        state.publications.push(
          withVersion(undefined, { draft, ownerId: owner.id, createdAt: now() }),
        );
      }
    }
  }
  const listeners = new Set<(profile: HubProfile | undefined) => void>();
  const setCurrent = (profile: HubProfile | undefined) => {
    state.current = profile;
    listeners.forEach((listener) => {
      listener(profile);
    });
  };
  const summaryOf = (stored: StoredPublication): PublicationSummary => toSummary(stored, profiles);
  return {
    ...createMemoryFlowStore({ current: () => state.current, now }),
    currentProfile: () => Promise.resolve(state.current),
    // No real auth in memory: nothing to verify, so no token.
    accessToken: () => Promise.resolve(undefined),
    onProfileChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    signIn: (method) => {
      const profile = profileFor(method, profiles);
      if (profile === undefined) return Promise.resolve(err({ kind: "invalid" as const }));
      setCurrent(profile);
      return Promise.resolve(ok(undefined));
    },
    signOut: () => {
      setCurrent(undefined);
      return Promise.resolve();
    },
    profile: (handle) => Promise.resolve(ok(profiles.find((profile) => profile.handle === handle))),
    search: (query) =>
      Promise.resolve(
        ok(newestFirst(state.publications.filter(matches(query, profiles))).map(summaryOf)),
      ),
    publicationsOf: (handle) => {
      const owner = profiles.find((profile) => profile.handle === handle);
      return Promise.resolve(
        ok(
          newestFirst(state.publications.filter(({ ownerId }) => ownerId === owner?.id)).map(
            summaryOf,
          ),
        ),
      );
    },
    publication: (handle, slug) => {
      const stored = findPublication(state.publications, profiles, { handle, slug });
      return Promise.resolve(ok(stored === undefined ? undefined : toDetail(stored, profiles)));
    },
    version: (publicationId, version) => {
      const found = state.publications
        .find(({ id }) => id === publicationId)
        ?.versions.find((candidate) => candidate.version === version);
      return Promise.resolve(found === undefined ? err({ kind: "invalid" as const }) : ok(found));
    },
    ownPublication: (slug) => {
      const owner = state.current;
      if (owner === undefined) return Promise.resolve(err({ kind: "signed-out" as const }));
      const stored = findPublication(state.publications, profiles, { handle: owner.handle, slug });
      return Promise.resolve(ok(stored === undefined ? undefined : summaryOf(stored)));
    },
    publish: (draft) => {
      const owner = state.current;
      if (owner === undefined) return Promise.resolve(err({ kind: "signed-out" as const }));
      const existing = findPublication(state.publications, profiles, {
        handle: owner.handle,
        slug: draft.slug,
      });
      if (existing !== undefined && existing.kind !== draft.kind)
        return Promise.resolve(err({ kind: "kind-mismatch" as const }));
      if (!isNewerVersion(draft.version, existing?.latestVersion))
        return Promise.resolve(err({ kind: "stale-version" as const }));
      const stored = withVersion(existing, { draft, ownerId: owner.id, createdAt: now() });
      state.publications = [...state.publications.filter(({ id }) => id !== stored.id), stored];
      return Promise.resolve(ok(summaryOf(stored)));
    },
  };
}

function profileFor(method: SignInMethod, profiles: ReadonlyArray<HubProfile>) {
  return method.kind === "email"
    ? profiles.find(({ handle }) => handle === method.email)
    : profiles[0];
}

function withVersion(
  existing: StoredPublication | undefined,
  {
    draft,
    ownerId,
    createdAt,
  }: { readonly draft: PublicationDraft; readonly ownerId: string; readonly createdAt: string },
): StoredPublication {
  const version: PublishedVersion = {
    version: draft.version,
    createdAt,
    flow: draft.flow,
    snapshot: draft.snapshot,
    ...(draft.manifest === undefined ? {} : { manifest: draft.manifest }),
  };
  return {
    id: existing?.id ?? `${ownerId}/${draft.slug}`,
    ownerId,
    slug: draft.slug,
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    tags: draft.tags,
    license: existing?.license ?? "MIT",
    latestVersion: draft.version,
    updatedAt: createdAt,
    versions: [version, ...(existing?.versions ?? [])],
  };
}

function findPublication(
  publications: ReadonlyArray<StoredPublication>,
  profiles: ReadonlyArray<HubProfile>,
  { handle, slug }: { readonly handle: string; readonly slug: string },
) {
  const owner = profiles.find((profile) => profile.handle === handle);
  return publications.find((stored) => stored.ownerId === owner?.id && stored.slug === slug);
}

function matches(query: SearchQuery, profiles: ReadonlyArray<HubProfile>) {
  const text = normalize(query.text ?? "");
  return (stored: StoredPublication) =>
    (query.kind === undefined || stored.kind === query.kind) &&
    [stored.title, stored.description, ...stored.tags, ownerOf(stored, profiles).handle].some(
      (field) => normalize(field).includes(text),
    );
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const newestFirst = (publications: ReadonlyArray<StoredPublication>) =>
  [...publications].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

function ownerOf(stored: StoredPublication, profiles: ReadonlyArray<HubProfile>) {
  const owner = profiles.find(({ id }) => id === stored.ownerId);
  if (owner === undefined) throw new Error(`Publication ${stored.id} has no owner profile`);
  return owner;
}

function toSummary(
  stored: StoredPublication,
  profiles: ReadonlyArray<HubProfile>,
): PublicationSummary {
  const { handle, displayName, avatarUrl } = ownerOf(stored, profiles);
  return {
    id: stored.id,
    slug: stored.slug,
    kind: stored.kind,
    title: stored.title,
    description: stored.description,
    tags: stored.tags,
    license: stored.license,
    ...(stored.latestVersion === undefined ? {} : { latestVersion: stored.latestVersion }),
    updatedAt: stored.updatedAt,
    owner: { handle, displayName, ...(avatarUrl === undefined ? {} : { avatarUrl }) },
  };
}

function toDetail(
  stored: StoredPublication,
  profiles: ReadonlyArray<HubProfile>,
): PublicationDetail {
  return {
    ...toSummary(stored, profiles),
    versions: stored.versions.map(({ version, createdAt, snapshot }) => ({
      version,
      createdAt,
      hasState: snapshot?.state !== undefined,
    })),
  };
}
