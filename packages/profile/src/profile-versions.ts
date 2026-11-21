import type { TSchema } from "@sinclair/typebox";
import { CURRENT_PROFILE_SCHEMA_VERSION, ProfileCardSchema } from "./profile-card.ts";

export type ProfileVersionEntry = {
  readonly schema: TSchema;
  /** Upgrades a card valid for this version to the shape of the next one. */
  readonly migrateToNext: (card: unknown) => unknown;
};

const identity = (card: unknown): unknown => card;

/** Adding a version means adding an entry here; the parser does not change. */
export const PROFILE_VERSIONS: ReadonlyMap<unknown, ProfileVersionEntry> = new Map([
  [1, { schema: ProfileCardSchema, migrateToNext: identity }],
]);

/** Walks the migration chain from `version` up to the current one. */
export function migrateToCurrent(version: number, card: unknown): unknown {
  let migrated = card;
  for (let from = version; from < CURRENT_PROFILE_SCHEMA_VERSION; from += 1) {
    migrated = PROFILE_VERSIONS.get(from)?.migrateToNext(migrated);
  }
  return migrated;
}
