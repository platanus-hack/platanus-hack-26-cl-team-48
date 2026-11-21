import { err, ok, parse, type Result, type ValidationIssue } from "@nodomics/protocol";
import type { ProfileCard } from "./profile-card.ts";
import { migrateToCurrent, PROFILE_VERSIONS } from "./profile-versions.ts";

const VERSION_PATH = "/schemaVersion";
const UNSUPPORTED_VERSION_MESSAGE = "Missing or unsupported profile schema version";

const versionIssue = (): ValidationIssue[] => [
  { path: VERSION_PATH, message: UNSUPPORTED_VERSION_MESSAGE },
];

const versionOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)["schemaVersion"]
    : undefined;

/** Parses a stored or submitted card of any supported version into the current one. */
export function parseProfileCard(value: unknown): Result<ProfileCard, ValidationIssue[]> {
  const version = versionOf(value);
  const entry = PROFILE_VERSIONS.get(version);
  if (entry === undefined || typeof version !== "number") return err(versionIssue());
  const parsed = parse(entry.schema, value);
  return parsed.ok ? ok(migrateToCurrent(version, parsed.value) as ProfileCard) : parsed;
}
