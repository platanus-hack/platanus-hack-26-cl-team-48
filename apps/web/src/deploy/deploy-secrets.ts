import { keyValuesOf } from "../form/key-values.ts";
import type { Secret } from "../library/flow-library.ts";

/** The values of the credentials the node's variables reference, by credential name. */
export function secretsForDeploy(
  env: unknown,
  secrets: ReadonlyArray<Secret>,
): Record<string, string> {
  const referenced = new Set(keyValuesOf(env).map(({ secret }) => secret));
  return Object.fromEntries(
    secrets.filter(({ name }) => referenced.has(name)).map(({ name, value }) => [name, value]),
  );
}
