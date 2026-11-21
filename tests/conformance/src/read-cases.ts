import { readFileSync, existsSync } from "node:fs";
import { coreNodes } from "@nodomics/nodes-core";
import type { NodeManifest } from "@nodomics/protocol";
import type { ExpectedDisplay } from "./check-displays.ts";
import { parseResponses } from "./response-fetch.ts";
import { parseTable } from "./parse-table.ts";
import type { Table, TestCase } from "./test-case.ts";

type OfficialCase = { readonly manifest: NodeManifest; readonly testCase: TestCase };
const NODE_DIRECTORY = new URL("../../../packages/nodes-core/nodes/", import.meta.url);

export function readCases(): readonly OfficialCase[] {
  return coreNodes.flatMap((manifest) => {
    const path = new URL(`${manifest.id}/cases.json`, NODE_DIRECTORY);
    if (!existsSync(path)) return [];
    const file: unknown = JSON.parse(readFileSync(path, "utf8"));
    const cases = record(file)["cases"];
    if (!Array.isArray(cases)) throw new Error(`Missing cases in ${path.href}`);
    return cases.map((value: unknown) => ({ manifest, testCase: parseCase(value, manifest) }));
  });
}

function parseCase(value: unknown, manifest: NodeManifest): TestCase {
  const testCase = record(value);
  const name = testCase["name"];
  if (typeof name !== "string" || name.length === 0) throw new Error("Missing case name");
  const expected = record(testCase["expected"]);
  for (const [port, output] of Object.entries(expected)) {
    const spec = manifest.outputs.find((output) => output.id === port);
    if (!spec) throw new Error(`Unknown expected port ${port}`);
    if (spec.type === "table") parseTable(output);
    else if (spec.type === "chart") record(output);
    else throw new Error(`Unsupported case port type ${spec.type}`);
  }
  return {
    name,
    params: record(testCase["params"]),
    inputs: parseTables(testCase["inputs"]),
    sources: parseTables(testCase["sources"] ?? {}),
    responses: parseResponses(testCase["responses"] ?? {}),
    expected,
    ...(testCase["displays"] === undefined
      ? {}
      : { displays: parseDisplays(testCase["displays"]) }),
  };
}

function parseDisplays(value: unknown): ExpectedDisplay[] {
  if (!Array.isArray(value)) throw new Error("Expected a list of figures in case file");
  return value.map((item: unknown) => {
    const { width, height, title } = record(item);
    if (typeof width !== "number" || typeof height !== "number")
      throw new Error("Expected the width and height of each figure");
    return typeof title === "string" ? { width, height, title } : { width, height };
  });
}

function parseTables(value: unknown): Readonly<Record<string, Table>> {
  return Object.fromEntries(
    Object.entries(record(value)).map(([port, table]) => [port, parseTable(table)]),
  );
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected object in case file");
  return Object.fromEntries(Object.entries(value));
}
