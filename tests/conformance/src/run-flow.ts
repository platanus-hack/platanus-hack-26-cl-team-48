import type { EngineClient } from "@nodomics/client";
import type { Flow, NepEventPayload } from "@nodomics/protocol";
import { observeRun } from "./observe-run.ts";

const REVISION = 1;

export async function runFlow(
  client: EngineClient,
  flow: Flow,
  options: { readonly targets: readonly string[]; readonly runTimeoutMs?: number },
): Promise<readonly NepEventPayload<"node.result">[]> {
  await configureFlow(client, flow);
  const observer = observeRun(client, options.runTimeoutMs);
  try {
    return await observer.wait({
      rev: REVISION,
      runId: (await client.request("flow.run", { rev: REVISION, targets: [...options.targets] }))
        .runId,
    });
  } finally {
    observer.dispose();
  }
}

async function configureFlow(client: EngineClient, flow: Flow): Promise<void> {
  const configured = await client.request("flow.set", { rev: REVISION, flow });
  if (configured.errors.length > 0)
    throw new Error(configured.errors.map((error) => error.message).join("\n"));
}
