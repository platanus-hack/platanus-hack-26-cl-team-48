import { ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import type { DeployError, EnvVarSpec } from "../types.ts";
import { invalidSpec } from "./node-params.ts";

const VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EnvParam = Type.Array(
  Type.Object({
    name: Type.String(),
    value: Type.Optional(Type.String()),
    secret: Type.Optional(Type.String()),
  }),
);

/** The environment variables of a Service node; a variable holds a literal value or names a secret. */
export function envSpecOf(raw: unknown): Result<EnvVarSpec[], DeployError> {
  const entries = parse(EnvParam, raw ?? []);
  if (!entries.ok)
    return invalidSpec("The environment variables must be a list of names and values");
  const env = entries.value.map(envVarOf);
  const invalid = env.find((variable) => !VARIABLE_NAME.test(variable.name));
  if (invalid !== undefined) return invalidSpec(`"${invalid.name}" is not a valid variable name`);
  if (env.some(hasValueAndSecret))
    return invalidSpec("A variable takes either a value or a secret, not both");
  if (new Set(env.map((variable) => variable.name)).size !== env.length)
    return invalidSpec("Each variable name can appear only once");
  return ok(env);
}

function envVarOf(entry: { name: string; value?: string; secret?: string }): EnvVarSpec {
  const secret = entry.secret?.trim();
  return {
    name: entry.name.trim(),
    ...(entry.value === undefined || entry.value === "" ? {} : { value: entry.value }),
    ...(secret === undefined || secret === "" ? {} : { secret }),
  };
}

const hasValueAndSecret = (variable: EnvVarSpec): boolean =>
  variable.value !== undefined && variable.secret !== undefined;
