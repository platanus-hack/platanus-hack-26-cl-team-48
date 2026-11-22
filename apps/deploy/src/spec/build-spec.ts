import { ok, type Result } from "@nodomics/protocol";
import { RUNTIMES, type BuildSpec, type DeployError, type Runtime } from "../types.ts";
import { invalidSpec, textParam, type NodeParams } from "./node-params.ts";

type BuildKind = BuildSpec["kind"];

const DEFAULT_BUILD: BuildKind = "native";
const DEFAULT_RUNTIME: Runtime = "node";

/** Each build kind copies only its own params, so leftovers of another kind never reach the provider. */
const BUILDERS: Record<BuildKind, (params: NodeParams) => Result<BuildSpec, DeployError>> = {
  docker: (params) =>
    ok({
      kind: "docker",
      dockerfilePath: textParam(params, "dockerfilePath") ?? "Dockerfile",
      dockerContext: textParam(params, "dockerContext") ?? ".",
    }),
  native: nativeBuildOf,
  static: (params) => {
    const buildCommand = textParam(params, "buildCommand");
    return ok({
      kind: "static",
      ...(buildCommand === undefined ? {} : { buildCommand }),
      publishPath: textParam(params, "publishPath") ?? "dist",
    });
  },
};

export function buildSpecOf(params: NodeParams): Result<BuildSpec, DeployError> {
  const kind = textParam(params, "build") ?? DEFAULT_BUILD;
  return isBuildKind(kind)
    ? BUILDERS[kind](params)
    : invalidSpec("The build must be docker, native or static");
}

function nativeBuildOf(params: NodeParams): Result<BuildSpec, DeployError> {
  const runtime = textParam(params, "runtime") ?? DEFAULT_RUNTIME;
  const startCommand = textParam(params, "startCommand");
  const buildCommand = textParam(params, "buildCommand");
  if (!isRuntime(runtime)) return invalidSpec(`The runtime must be one of ${RUNTIMES.join(", ")}`);
  if (buildCommand === undefined) return invalidSpec("A native build needs a build command");
  if (startCommand === undefined) return invalidSpec("A native build needs a start command");
  return ok({ kind: "native", runtime, buildCommand, startCommand });
}

const isBuildKind = (kind: string): kind is BuildKind => Object.hasOwn(BUILDERS, kind);

const isRuntime = (runtime: string): runtime is Runtime =>
  RUNTIMES.some((candidate) => candidate === runtime);
