import type { EngineClient } from "@nodomics/client";
import type { NepEventPayload } from "@nodomics/protocol";

export const DEFAULT_RUN_TIMEOUT_MS = 30000;
type RunEvents = {
  readonly results: NepEventPayload<"node.result">[];
  readonly statuses: NepEventPayload<"node.status">[];
  readonly finished: NepEventPayload<"run.finished">[];
};
type RunIdentity = { readonly rev: number; readonly runId: string };

export function observeRun(client: EngineClient, runTimeoutMs = DEFAULT_RUN_TIMEOUT_MS) {
  const events: RunEvents = { results: [], statuses: [], finished: [] };
  const unsubscribe = subscribeRun(client, events);
  return {
    wait: async (identity: RunIdentity) => {
      await waitForFinished({ client, events, identity, runTimeoutMs });
      assertRunSucceeded(events, identity);
      return events.results.filter((event) => matchesRun(event, identity));
    },
    dispose: () => {
      unsubscribe.forEach((off) => {
        off();
      });
    },
  };
}

function subscribeRun(client: EngineClient, events: RunEvents) {
  return [
    client.on("node.result", (event) => {
      events.results.push(event);
    }),
    client.on("node.status", (event) => {
      events.statuses.push(event);
    }),
    client.on("run.finished", (event) => {
      events.finished.push(event);
    }),
  ];
}

async function waitForFinished(options: {
  readonly client: EngineClient;
  readonly events: RunEvents;
  readonly identity: RunIdentity;
  readonly runTimeoutMs: number;
}): Promise<void> {
  const cleanup: (() => void)[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      cleanup.push(
        options.client.on("run.finished", (event) => {
          if (matchesRun(event, options.identity)) resolve();
        }),
      );
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for run.finished: ${options.identity.runId}`));
      }, options.runTimeoutMs);
      cleanup.push(() => {
        clearTimeout(timer);
      });
      if (options.events.finished.some((event) => matchesRun(event, options.identity))) resolve();
    });
  } finally {
    cleanup.forEach((dispose) => {
      dispose();
    });
  }
}

function assertRunSucceeded(events: RunEvents, identity: RunIdentity): void {
  const errors = events.statuses.filter(
    (event) => matchesRun(event, identity) && event.state === "error",
  );
  if (errors.length > 0) throw new Error(errors.map(describeNodeError).join("\n"));
  if (events.finished.find((event) => matchesRun(event, identity))?.status !== "done")
    throw new Error(`Run ${identity.runId} did not finish successfully`);
}

/** The technical detail is what tells a conformance failure apart from a user-facing one. */
function describeNodeError({ nodeId, error }: NepEventPayload<"node.status">): string {
  const detail = error?.detail === undefined ? "" : ` (${error.detail})`;
  return `${nodeId}: ${error?.message ?? "Node failed"}${detail}`;
}

function matchesRun(event: RunIdentity, identity: RunIdentity): boolean {
  return event.rev === identity.rev && event.runId === identity.runId;
}
