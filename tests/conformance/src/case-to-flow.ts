import {
  FLOW_FORMAT,
  Flow,
  parse,
  type FlowNode,
  type FlowEdge,
  type NodeManifest,
} from "@nodomics/protocol";
import { bindSources } from "./bind-sources.ts";
import type { TestCase } from "./test-case.ts";

export const CASE_NODE_ID = "subject";

export function caseToFlow(
  manifest: NodeManifest,
  testCase: TestCase,
  sourceIds: Readonly<Record<string, string>>,
): Flow {
  const ports = Object.keys(testCase.inputs);
  const flow = parse(Flow, {
    format: FLOW_FORMAT,
    name: testCase.name,
    nodes: [...createSourceNodes(ports, sourceIds), createSubjectNode(manifest, testCase.params)],
    edges: createConnections(ports),
  });
  if (!flow.ok) throw new Error(`Invalid case flow: ${JSON.stringify(flow.error)}`);
  return bindSources(flow.value, sourceIds);
}

function createSourceNodes(
  ports: readonly string[],
  sourceIds: Readonly<Record<string, string>>,
): FlowNode[] {
  return ports.map((port, index) => ({
    id: `source-${String(index)}`,
    type: "core.source.csv",
    version: "0.1.0",
    params: { sourceId: requireSourceAlias(sourceIds, port) },
    position: { x: 0, y: 0 },
  }));
}

function createSubjectNode(manifest: NodeManifest, params: TestCase["params"]): FlowNode {
  return {
    id: CASE_NODE_ID,
    type: manifest.id,
    version: manifest.version,
    params: { ...params },
    position: { x: 0, y: 0 },
  };
}

function createConnections(ports: readonly string[]): FlowEdge[] {
  return ports.map((port, index) => ({
    id: `edge-${String(index)}`,
    from: { node: `source-${String(index)}`, port: "out" },
    to: { node: CASE_NODE_ID, port },
  }));
}

function requireSourceAlias(sourceIds: Readonly<Record<string, string>>, port: string): string {
  if (sourceIds[port] === undefined) throw new Error(`Missing source for port ${port}`);
  return port;
}
