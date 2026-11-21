import type { NodeManifest } from "@nodomics/protocol";
import { createHarness } from "./coordinator-harness.ts";
import {
  coreCatalog,
  doubleFilterManifest,
  edge,
  filterManifest,
  flowNode,
  flowOf,
} from "./catalog-fixtures.ts";

const queryParams = {
  type: "object" as const,
  properties: { op: { type: "string" } },
  not: { properties: { op: { const: "; DROP TABLE t; --" } }, required: ["op"] },
};
export const queryManifest: NodeManifest = {
  ...filterManifest,
  id: "test.query",
  inputs: [],
  params: queryParams,
  impl: { kind: "sql", template: "SELECT 1 {{op}} 1" },
};
export const queryFlow = (op: string) => flowOf([flowNode("q", "test.query", { op })], []);
export const queryHarness = () => createHarness({ catalog: [...coreCatalog, queryManifest] });
export const compositeFlow = () =>
  flowOf(
    [flowNode("s", "test.query", { op: "+" }), flowNode("d", doubleFilterManifest.id)],
    [edge("s", "d")],
  );
