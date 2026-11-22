import { randomUUID } from "node:crypto";
import { coreNodes, sampleDatasets } from "@nodomics/nodes-core";
import { loadConfig } from "./config.ts";
import { createEngineRunner } from "./engine-runner.ts";
import { createSupabaseIdentity } from "./identity.ts";
import { createNodeExecutors } from "./node-executors.ts";
import { createMcpServer } from "./server.ts";
import { createSupabaseStores } from "./supabase-stores.ts";
import { createTools } from "./tools.ts";

const config = loadConfig(process.env);
if (!config.ok) {
  process.stderr.write(
    `${config.error.issues.map((issue) => `${issue.variable}: ${issue.kind}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  const options = { supabaseUrl: config.value.supabaseUrl, anonKey: config.value.supabaseAnonKey };
  const runner = createEngineRunner({
    createExecutors: createNodeExecutors({ withPython: true }),
    catalog: coreNodes,
    presetSources: Object.fromEntries(
      Object.entries(sampleDatasets).map(([id, source]) => [
        id,
        { format: source.format, location: { kind: "url", url: source.url } },
      ]),
    ),
    fetch,
  });
  const server = createMcpServer({
    identity: createSupabaseIdentity({ ...options, fetch }),
    tools: createTools({
      storesFor: createSupabaseStores(options),
      catalog: coreNodes,
      runner,
      createId: randomUUID,
      now: Date.now,
    }),
  });
  server.listen(config.value.port, "0.0.0.0");
}
