import type { EngineClient } from "@nodomics/client";
import type { NodeManifest, ResultRef } from "@nodomics/protocol";
import { CASE_NODE_ID, caseToFlow } from "./case-to-flow.ts";
import { checkDisplays, collectDisplays } from "./check-displays.ts";
import { readTable } from "./read-table.ts";
import { runFlow } from "./run-flow.ts";
import { findResult } from "./find-result.ts";
import { compareTables } from "./compare-tables.ts";
import { parseTable } from "./parse-table.ts";
import { uploadTables } from "./upload-tables.ts";
import type { TestCase } from "./test-case.ts";

export async function runCase(
  client: EngineClient,
  manifest: NodeManifest,
  testCase: TestCase & { readonly runTimeoutMs?: number },
): Promise<Readonly<Record<string, unknown>>> {
  const sourceIds = await uploadTables(client, { ...testCase.sources, ...testCase.inputs });
  const displays = collectDisplays(client);
  const results = await runFlow(client, caseToFlow(manifest, testCase, sourceIds), {
    targets: [CASE_NODE_ID],
    ...(testCase.runTimeoutMs === undefined ? {} : { runTimeoutMs: testCase.runTimeoutMs }),
  }).finally(displays.stop);
  if (testCase.displays !== undefined)
    await checkDisplays(client, displays.of(CASE_NODE_ID), testCase.displays);
  const actual: Record<string, unknown> = {};
  for (const port of manifest.outputs.filter((port) => Object.hasOwn(testCase.expected, port.id))) {
    actual[port.id] =
      port.type === "chart"
        ? await readChartSpec(client)
        : await readComparedTable(
            client,
            findResult(results, CASE_NODE_ID, port.id),
            testCase.expected[port.id],
          );
  }
  return actual;
}

/** Views are computed on demand by `data.view`; a chart port has no `node.result` of its own. */
async function readChartSpec(client: EngineClient): Promise<unknown> {
  return (await client.request("data.view", { nodeId: CASE_NODE_ID })).spec;
}

async function readComparedTable(client: EngineClient, ref: ResultRef, expected: unknown) {
  const actual = await readTable(client, ref);
  const compared = compareTables(actual, parseTable(expected));
  if (!compared.ok) throw new Error(compared.error.join("\n"));
  return actual;
}
