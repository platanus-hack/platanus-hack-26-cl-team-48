import { Type } from "@sinclair/typebox";
import { portsOf } from "./fake-flow.ts";
import {
  SAMPLE_PAGE_SIZE,
  executeFlow,
  resolveFlow,
  samplePage,
  validateFlow,
} from "./fake-run.ts";
import { defineTool, done, toolFailed, type FakeTool } from "./fake-tool.ts";

const FlowRefFields = {
  draftId: Type.Optional(Type.String()),
  flowId: Type.Optional(Type.String()),
};

const listNodes = defineTool({
  name: "nodes.list",
  description: "List the node types available to build with.",
  schema: Type.Object({}),
  handler: (state) =>
    done(
      state,
      Object.values(state.catalog).map(({ type, title }) => ({ type, title })),
    ),
});

const getManifest = defineTool({
  name: "nodes.get_manifest",
  description: "Read a node manifest: ports and parameters with JSON Schema and units.",
  schema: Type.Object({ type: Type.String() }),
  handler: (state, { type }) => {
    const manifest = state.catalog[type];
    if (!manifest) return toolFailed(`Unknown node type "${type}"`);
    const params = Object.entries(manifest.params).map(([name, { title, unit, schema }]) => ({
      name,
      title,
      unit: unit ?? null,
      schema: { ...schema },
    }));
    return done(state, { ...manifest, params });
  },
});

const getFlow = defineTool({
  name: "flows.get",
  description: "Read a flow or a draft: nodes, connections and code nodes.",
  schema: Type.Object(FlowRefFields),
  handler: (state, ref) => {
    const flow = resolveFlow(state, ref);
    return typeof flow === "string" ? toolFailed(flow) : done(state, flow);
  },
});

const searchFlows = defineTool({
  name: "flows.search",
  description: "Search existing flows by id.",
  schema: Type.Object({ query: Type.String() }),
  handler: (state, { query }) =>
    done(
      state,
      Object.keys(state.flows).filter((id) => id.toLowerCase().includes(query.toLowerCase())),
    ),
});

const validate = defineTool({
  name: "flows.validate",
  description: "Validate a flow or draft without running it.",
  schema: Type.Object(FlowRefFields),
  handler: (state, ref) => {
    const flow = resolveFlow(state, ref);
    if (typeof flow === "string") return toolFailed(flow);
    const issues = validateFlow(flow, state.catalog);
    return done(state, { valid: issues.length === 0, issues });
  },
});

const runFlow = defineTool({
  name: "run.flow",
  description: "Run a flow or draft, or only up to some nodes. Never writes flows.",
  schema: Type.Object({ ...FlowRefFields, upTo: Type.Optional(Type.Array(Type.String())) }),
  handler: (state, { upTo, ...ref }) => {
    const flow = resolveFlow(state, ref);
    return typeof flow === "string"
      ? toolFailed(flow)
      : done(state, { nodes: executeFlow(flow, state.catalog, upTo) });
  },
});

const runSample = defineTool({
  name: "run.sample",
  description: `Read a paginated sample of a port, at most ${String(SAMPLE_PAGE_SIZE)} rows per page.`,
  schema: Type.Object({
    ...FlowRefFields,
    nodeId: Type.String(),
    port: Type.String(),
    page: Type.Optional(Type.Integer({ minimum: 0 })),
  }),
  handler: (state, { nodeId, port, page, ...ref }) => {
    const flow = resolveFlow(state, ref);
    if (typeof flow === "string") return toolFailed(flow);
    const ports = portsOf(flow, state.catalog, nodeId);
    if (!ports?.outputs.includes(port))
      return toolFailed(`"${nodeId}.${port}" is not an output port`);
    return done(state, samplePage(page ?? 0));
  },
});

const runLogs = defineTool({
  name: "run.logs",
  description: "Read the logs of a Python code node.",
  schema: Type.Object({ ...FlowRefFields, nodeId: Type.String() }),
  handler: (state, { nodeId, ...ref }) => {
    const flow = resolveFlow(state, ref);
    if (typeof flow === "string") return toolFailed(flow);
    const code = flow.customNodes[nodeId];
    return code?.language === "python"
      ? done(state, { nodeId, lines: [`ran ${code.id}`] })
      : toolFailed(`"${nodeId}" is not a Python code node`);
  },
});

export const READ_TOOLS: readonly FakeTool[] = [
  listNodes,
  getManifest,
  getFlow,
  searchFlows,
  validate,
  runFlow,
  runSample,
  runLogs,
];
