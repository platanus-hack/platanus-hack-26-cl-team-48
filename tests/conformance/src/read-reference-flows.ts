import { existsSync, readFileSync, readdirSync } from "node:fs";
import { Flow, parse } from "@nodomics/protocol";
import { parseTable } from "./parse-table.ts";
import type { Table } from "./test-case.ts";

export type ReferenceFlow = {
  readonly name: string;
  readonly flow: Flow;
  readonly expected: Readonly<Record<string, Table>>;
  readonly sources: Readonly<Record<string, Table>>;
};
const FLOW_DIRECTORY = new URL("../flows/", import.meta.url);

export function readReferenceFlows(): readonly ReferenceFlow[] {
  return readdirSync(FLOW_DIRECTORY)
    .filter((file) => file.endsWith(".nodo.json"))
    .sort()
    .map((file) => {
      const name = file.replace(".nodo.json", "");
      const flow = parse(Flow, readJson(new URL(file, FLOW_DIRECTORY)));
      if (!flow.ok)
        throw new Error(`Invalid reference flow ${name}: ${JSON.stringify(flow.error)}`);
      const sources = new URL(`${name}.sources.json`, FLOW_DIRECTORY);
      return {
        name: `reference:${name}`,
        flow: flow.value,
        expected: readTables(new URL(`${name}.expected.json`, FLOW_DIRECTORY)),
        sources: existsSync(sources) ? readTables(sources) : {},
      };
    });
}

function readJson(path: URL): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readTables(path: URL): Readonly<Record<string, Table>> {
  const value = readJson(path);
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Invalid table map in ${path.href}`);
  return Object.fromEntries(
    Object.entries(value).map(([port, table]: [string, unknown]) => [port, parseTable(table)]),
  );
}
