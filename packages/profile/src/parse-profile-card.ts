import { err, ok, parse, type Result, type ValidationIssue } from "@nodomics/protocol";
import type { ProfileCard } from "./profile-card.ts";
import {
  migrateToCurrent,
  PROFILE_VERSIONS,
  type ProfileVersionEntry,
} from "./profile-versions.ts";

const VERSION_PATH = "/schemaVersion";
const UNSUPPORTED_VERSION_MESSAGE = "Missing or unsupported profile schema version";

const UNREADABLE_CARD_MESSAGE = "The profile card could not be read";

const versionIssue = (): ValidationIssue[] => [
  { path: VERSION_PATH, message: UNSUPPORTED_VERSION_MESSAGE },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reading a property can run hostile code (getters, proxies); that is not our failure. */
function versionOf(value: unknown): unknown {
  try {
    return isRecord(value) ? value["schemaVersion"] : undefined;
  } catch {
    return undefined;
  }
}

function parseWithSchema(
  schema: ProfileVersionEntry["schema"],
  value: unknown,
): Result<unknown, ValidationIssue[]> {
  try {
    return parse(schema, value);
  } catch {
    return err([{ path: VERSION_PATH, message: UNREADABLE_CARD_MESSAGE }]);
  }
}

/** Parses a stored or submitted card of any supported version into the current one. */
export function parseProfileCard(value: unknown): Result<ProfileCard, ValidationIssue[]> {
  const version = versionOf(value);
  const entry = PROFILE_VERSIONS.get(version);
  if (entry === undefined || typeof version !== "number") return err(versionIssue());
  const parsed = parseWithSchema(entry.schema, value);
  // The migrated value was just validated against a schema that ends in the current version.
  return parsed.ok ? ok(migrateToCurrent(version, parsed.value) as ProfileCard) : parsed;
}
