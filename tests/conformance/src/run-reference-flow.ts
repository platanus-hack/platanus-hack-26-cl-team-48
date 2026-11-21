import type { EngineClient } from "@nodomics/client";
import type { ReferenceFlow } from "./read-reference-flows.ts";
import { runFlow } from "./run-flow.ts";
import { findResult } from "./find-result.ts";
import { readTable } from "./read-table.ts";
import { uploadTables } from "./upload-tables.ts";
import { bindSources } from "./bind-sources.ts";
import type { Table } from "./test-case.ts";

export async function runReferenceFlow(
  client: EngineClient,
  reference: ReferenceFlow,
  options: { readonly runTimeoutMs?: number } = {},
): Promise<Readonly<Record<string, Table>>> {
  const flow = bindSources(reference.flow, await uploadTables(client, reference.sources));
  const results = await runFlow(client, flow, { targets: ["result"], ...options });
  const actual: Record<string, Table> = {};
  for (const port of Object.keys(reference.expected))
    actual[port] = await readTable(client, findResult(results, "result", port));
  return actual;
}
