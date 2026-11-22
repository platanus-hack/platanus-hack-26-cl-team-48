import { err, ok } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { describeManifest, validateFlow } from "./flow-edit/index.ts";
import { readFlow, type ToolDeps } from "./tool-context.ts";
import { defineTool, type ToolDefinition } from "./tool-definition.ts";
import { FlowRefSchema, LogsSchema, RunSchema, SampleSchema } from "./tool-schema.ts";

export function readTools(deps: ToolDeps): readonly ToolDefinition[] {
  return [
    defineTool({
      name: "nodes.list",
      description: "List available nodes",
      schema: Type.Object({}),
      execute: () =>
        Promise.resolve(
          ok(deps.catalog.map((manifest) => ({ type: manifest.id, title: manifest.name }))),
        ),
    }),
    defineTool({
      name: "nodes.get_manifest",
      description: "Describe a node manifest",
      schema: Type.Object({ type: Type.String() }),
      execute: ({ type }) => {
        const manifest = deps.catalog.find((manifest) => manifest.id === type);
        return Promise.resolve(
          manifest === undefined
            ? err({ message: `Unknown node type: ${type}` })
            : ok(describeManifest(manifest)),
        );
      },
    }),
    defineTool({
      name: "flows.search",
      description: "Search your flows",
      schema: Type.Object({ query: Type.String() }),
      execute: async ({ query }, identity) => {
        const result = await deps.storesFor(identity).flows.search(query);
        return result.ok ? ok(result.value.map((flow) => flow.id)) : result;
      },
    }),
    defineTool({
      name: "flows.get",
      description: "Read a flow or draft",
      schema: FlowRefSchema,
      execute: (ref, identity) => readFlow(deps, ref, identity),
    }),
    defineTool({
      name: "flows.validate",
      description: "Validate a flow or draft",
      schema: FlowRefSchema,
      execute: async (ref, identity) => {
        const flow = await readFlow(deps, ref, identity);
        return flow.ok ? ok(validateFlow(flow.value, deps.catalog)) : flow;
      },
    }),
    defineTool({
      name: "run.flow",
      description: "Run a flow or draft",
      schema: RunSchema,
      execute: async (ref, identity) => {
        const flow = await readFlow(deps, ref, identity);
        return flow.ok ? deps.runner.run(flow.value, ref.upTo) : flow;
      },
    }),
    defineTool({
      name: "run.sample",
      description: "Read a result sample",
      schema: SampleSchema,
      execute: async (ref, identity) => {
        const flow = await readFlow(deps, ref, identity);
        return flow.ok
          ? deps.runner.sample(flow.value, {
              nodeId: ref.nodeId,
              port: ref.port,
              page: ref.page ?? 0,
            })
          : flow;
      },
    }),
    defineTool({
      name: "run.logs",
      description: "Read node logs",
      schema: LogsSchema,
      execute: async (ref, identity) => {
        const flow = await readFlow(deps, ref, identity);
        return flow.ok ? deps.runner.logs(flow.value, ref.nodeId) : flow;
      },
    }),
  ];
}
