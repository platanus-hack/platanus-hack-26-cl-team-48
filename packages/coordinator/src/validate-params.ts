import { Validator, type OutputUnit, type Schema } from "@cfworker/json-schema";
import type { ConfigIssue, NodeManifest } from "@nodomics/protocol";
import type { FlatNode } from "./flat-graph.ts";

const SCHEMA_DRAFT = "2020-12";
const PARAM_LOCATION = /^#\/([^/]+)/;

/** Checks a node's params against its manifest JSON Schema before anything is rendered. */
export function validateParams(node: FlatNode): ConfigIssue[] {
  const missing = findMissingParams(node);
  const invalid = findInvalidParams(node).filter((param) => !missing.includes(param));
  return [
    ...missing.map((param) => requiredIssue(node.id, param)),
    ...invalid.map((param) => invalidIssue(node.id, param)),
  ];
}

const findMissingParams = (node: FlatNode): string[] =>
  (node.manifest.params.required ?? []).filter((param) => node.params[param] === undefined);

function findInvalidParams(node: FlatNode): string[] {
  const { errors } = new Validator(copySchema(node.manifest.params), SCHEMA_DRAFT, false).validate(
    node.params,
  );
  return [...new Set(errors.flatMap(paramOf))];
}

const paramOf = (error: OutputUnit): string[] => {
  const param = PARAM_LOCATION.exec(error.instanceLocation)?.[1];
  return param === undefined
    ? ["required", "properties"].includes(error.keyword)
      ? []
      : [""]
    : [decodeURIComponent(param)];
};

function copySchema(schema: NodeManifest["params"]): Schema {
  // The validator annotates the schema objects it reads; a copy keeps the catalog manifests intact.
  // The manifest was parsed at the boundary, so its params are a JSON Schema object.
  const copy: unknown = JSON.parse(JSON.stringify(schema));
  return copy as Schema;
}

const requiredIssue = (nodeId: string, param: string): ConfigIssue => ({
  nodeId,
  code: "PARAM_REQUIRED",
  message: `Falta el parámetro "${param}"`,
  param,
});

const invalidIssue = (nodeId: string, param: string): ConfigIssue => ({
  nodeId,
  code: "PARAM_INVALID",
  message:
    param === ""
      ? "Los parámetros no son válidos"
      : `El parámetro "${param}" no tiene un valor válido`,
  ...(param === "" ? {} : { param }),
});
