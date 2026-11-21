import { describe, expect, it } from "vitest";
import { createEngineClient, type EngineClient, type Transport } from "@nodomics/client";
import { coreNodes } from "@nodomics/nodes-core";
import { FLOW_FORMAT, type Capabilities, type Flow } from "@nodomics/protocol";
import type { Responses } from "./response-fetch.ts";
import { compareTables } from "./compare-tables.ts";
import { parseTable } from "./parse-table.ts";
import { readCases } from "./read-cases.ts";
import { readReferenceFlows } from "./read-reference-flows.ts";
import { DEFAULT_RUN_TIMEOUT_MS } from "./observe-run.ts";
import { runCase } from "./run-case.ts";
import { runReferenceFlow } from "./run-reference-flow.ts";

type SuiteOptions = {
  readonly name: string;
  readonly startEngine: (responses?: Responses) => Transport | Promise<Transport>;
  readonly runTimeoutMs?: number;
  readonly skip?: readonly string[];
};

export function defineConformanceSuite(options: SuiteOptions): void {
  describe(options.name, () => {
    for (const { manifest, testCase } of readCases()) {
      const name = `${manifest.id}: ${testCase.name}`;
      it.skipIf(
        options.skip?.includes(manifest.id) === true || options.skip?.includes(name) === true,
      )(
        name,
        async () => {
          await withClient(
            options,
            async (client) => {
              const actual = await runCase(client, manifest, {
                ...testCase,
                runTimeoutMs: options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
              });
              for (const port of manifest.outputs.filter(
                (port) => port.type === "chart" && Object.hasOwn(testCase.expected, port.id),
              )) {
                expect(actual[port.id]).toEqual(testCase.expected[port.id]);
              }
            },
            testCase.responses,
          );
        },
        options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
      );
    }
    registerReferences(options);
    registerCompletion(options);
  });
}

/** Skippable by this name, like any case. */
export const COMPLETION_CASE = "code.complete: members of an installed library";
const CODE_NODE = "code";

function registerCompletion(options: SuiteOptions): void {
  it.skipIf(options.skip?.includes(COMPLETION_CASE) === true)(
    COMPLETION_CASE,
    async () => {
      await withClient(options, async (client, capabilities) => {
        // Completion is optional; an engine that does not announce it is still conformant.
        if (capabilities.codeCompletion !== true) return;
        await client.request("flow.set", { rev: 1, flow: codeNodeFlow() });
        const completions = await client.request("code.complete", {
          nodeId: CODE_NODE,
          code: "import pandas as pd\npd.read_cs",
          line: 2,
          column: 10,
        });
        expect(completions.items).toContainEqual(
          expect.objectContaining({ label: "read_csv", kind: "function" }),
        );
      });
    },
    options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
  );
}

const codeNodeFlow = (): Flow => ({
  format: FLOW_FORMAT,
  nodes: [
    {
      id: CODE_NODE,
      type: "core.python.custom",
      version: "0.1.0",
      params: {},
      position: { x: 0, y: 0 },
    },
  ],
  edges: [],
});

function registerReferences(options: SuiteOptions): void {
  for (const reference of readReferenceFlows())
    it.skipIf(options.skip?.includes(reference.name) === true)(
      reference.name,
      async () => {
        await withClient(options, async (client) => {
          const actual = await runReferenceFlow(client, reference, {
            runTimeoutMs: options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
          });
          for (const [port, expected] of Object.entries(reference.expected))
            assertTable(actual[port], expected);
        });
      },
      options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
    );
}

async function withClient(
  options: SuiteOptions,
  run: (client: EngineClient, capabilities: Capabilities) => Promise<void>,
  responses?: Responses,
): Promise<void> {
  const client = createEngineClient(await options.startEngine(responses));
  try {
    const connected = await client.connect({ client: "nodomics-conformance" });
    if (!connected.ok) throw new Error(`Connection failed: ${JSON.stringify(connected.error)}`);
    await client.request("nodes.register", { nodes: [...coreNodes] });
    await run(client, connected.value);
  } finally {
    client.close();
  }
}

function assertTable(actual: unknown, expected: unknown): void {
  const compared = compareTables(parseTable(actual), parseTable(expected));
  expect(compared.ok, compared.ok ? "" : compared.error.join("\n")).toBe(true);
}
