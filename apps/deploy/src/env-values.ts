import type { Secrets } from "./hosting-provider.ts";
import type { EnvVarSpec } from "./types.ts";

/** The value each variable gets in the service: its literal value or the value of the secret it names. */
export const envValuesOf = (
  env: readonly EnvVarSpec[],
  secrets: Secrets,
): { readonly key: string; readonly value: string }[] =>
  env.map((variable) => ({
    key: variable.name,
    value:
      variable.value ?? (variable.secret === undefined ? "" : (secrets[variable.secret] ?? "")),
  }));
