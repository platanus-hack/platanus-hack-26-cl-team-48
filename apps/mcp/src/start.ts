import { randomUUID } from "node:crypto";
import { coreNodes } from "@nodomics/nodes-core";
import { loadConfig } from "./config.ts";
import { createSupabaseIdentity } from "./identity.ts";
import { createMcpServer } from "./server.ts";
import { createSupabaseStores } from "./supabase-stores.ts";
import { createTools } from "./tools.ts";
import { createWorkerRunner } from "./worker-runner.ts";

/** A run past this is stopped by terminating its worker (ADR 0026 §6). */
const RUN_TIMEOUT_MS = 60_000;

const config = loadConfig(process.env);
if (!config.ok) {
  process.stderr.write(
    `${config.error.issues.map((issue) => `${issue.variable}: ${issue.kind}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  const options = { supabaseUrl: config.value.supabaseUrl, anonKey: config.value.supabaseAnonKey };
  const runner = createWorkerRunner({
    workerUrl: new URL("./runner-worker.js", import.meta.url),
    timeoutMs: RUN_TIMEOUT_MS,
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
