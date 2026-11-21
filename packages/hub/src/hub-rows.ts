import { err, Flow, NodeManifest, ok, parse, type Result } from "@nodomics/protocol";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import type { StoredFlow } from "./flow-store.ts";
import type {
  HubError,
  HubProfile,
  PublicationSummary,
  PublishedVersion,
  VersionSummary,
} from "./hub.ts";
import { isNewerVersion } from "./versions.ts";

const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()]);

const ProfileRow = Type.Object({
  id: Type.String(),
  handle: Type.String(),
  display_name: Type.String(),
  avatar_url: Nullable(Type.String()),
});

const PublicationRow = Type.Object({
  id: Type.String(),
  slug: Type.String(),
  kind: Type.Union([Type.Literal("flow"), Type.Literal("node")]),
  title: Type.String(),
  description: Type.String(),
  tags: Type.Array(Type.String()),
  license: Type.String(),
  latest_version: Nullable(Type.String()),
  updated_at: Type.String(),
  owner_handle: Type.String(),
  owner_name: Type.String(),
  owner_avatar: Nullable(Type.String()),
});

const VersionSummaryRow = Type.Object({
  version: Type.String(),
  created_at: Type.String(),
  has_state: Type.Boolean(),
});

const VersionRow = Type.Object({
  version: Type.String(),
  created_at: Type.String(),
  flow: Flow,
  manifest: Nullable(NodeManifest),
});

/** Rows come from the network: each one is parsed once, here, into the hub's types. */
function parseRow<S extends TSchema>(schema: S, row: unknown): Result<Static<S>, HubError> {
  const parsed = parse(schema, row);
  return parsed.ok
    ? parsed
    : err({
        kind: "invalid",
        detail: parsed.error.map(({ path, message }) => `${path}: ${message}`).join("; "),
      });
}

function parseRows<S extends TSchema, T>(
  schema: S,
  rows: ReadonlyArray<unknown>,
  convert: (row: Static<S>) => T,
): Result<T[], HubError> {
  const converted: T[] = [];
  for (const row of rows) {
    const parsed = parseRow(schema, row);
    if (!parsed.ok) return parsed;
    converted.push(convert(parsed.value));
  }
  return ok(converted);
}

const optional = <K extends string>(key: K, value: string | null) =>
  (value === null ? {} : { [key]: value }) as Partial<Record<K, string>>;

export function toProfile(row: unknown): Result<HubProfile, HubError> {
  const parsed = parseRow(ProfileRow, row);
  if (!parsed.ok) return parsed;
  const { id, handle, display_name, avatar_url } = parsed.value;
  return ok({ id, handle, displayName: display_name, ...optional("avatarUrl", avatar_url) });
}

export const toSummaries = (rows: ReadonlyArray<unknown>) =>
  parseRows(PublicationRow, rows, toSummary);

function toSummary(row: Static<typeof PublicationRow>): PublicationSummary {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    description: row.description,
    tags: row.tags,
    license: row.license,
    ...optional("latestVersion", row.latest_version),
    updatedAt: row.updated_at,
    owner: {
      handle: row.owner_handle,
      displayName: row.owner_name,
      ...optional("avatarUrl", row.owner_avatar),
    },
  };
}

export function toVersionSummaries(
  rows: ReadonlyArray<unknown>,
): Result<VersionSummary[], HubError> {
  const parsed = parseRows(VersionSummaryRow, rows, (row) => ({
    version: row.version,
    createdAt: row.created_at,
    hasState: row.has_state,
  }));
  return parsed.ok
    ? ok(parsed.value.sort((left, right) => (isNewerVersion(left.version, right.version) ? -1 : 1)))
    : parsed;
}

export function toVersion(row: unknown): Result<Omit<PublishedVersion, "snapshot">, HubError> {
  const parsed = parseRow(VersionRow, row);
  if (!parsed.ok) return parsed;
  const { version, created_at, flow, manifest } = parsed.value;
  return ok({ version, createdAt: created_at, flow, ...(manifest === null ? {} : { manifest }) });
}

const FlowRow = Type.Object({
  id: Type.String(),
  owner_id: Type.String(),
  visibility: Type.Union([Type.Literal("private"), Type.Literal("public")]),
  document: Type.Unknown(),
  updated_at: Type.String(),
});

/** The document stays unknown here: the interface parses it into its own saved flow. */
export function toStoredFlow(row: unknown): StoredFlow | undefined {
  const parsed = parse(FlowRow, row);
  if (!parsed.ok || parsed.value.document === undefined || parsed.value.document === null)
    return undefined;
  const { id, owner_id, visibility, document, updated_at } = parsed.value;
  return { id, ownerId: owner_id, visibility, document, updatedAt: updated_at };
}
