import { err } from "@nodomics/protocol";
import { useState } from "react";
import { useAppStores } from "../app-context.ts";
import { useAgent } from "./agent-context.ts";
import type { AgentAnswer, AgentProgress, AgentResult } from "./agent-service.ts";

export type Exchange = {
  readonly id: number;
  readonly goal: string;
  /** What the agent has written so far, while it works. */
  readonly live: string;
  /** The tool the agent used last, while it works. */
  readonly tool?: string;
  readonly reply?: AgentResult<AgentAnswer>;
};

// Allow the server's five-minute loop and the final proposal read to finish.
const REQUEST_TIMEOUT_MS = 330_000;

const STEP_BREAK = "\n\n";

function withProgress(exchange: Exchange, progress: AgentProgress): Exchange {
  switch (progress.type) {
    case "text":
      return { ...exchange, live: exchange.live + progress.delta };
    case "step":
      return { ...exchange, live: exchange.live + STEP_BREAK };
    case "tool":
      return { ...exchange, tool: progress.name };
  }
}

/** The user's requests to the agent about one saved flow, each with its reply once it arrives. */
export function useAgentConversation() {
  const agent = useAgent();
  const { savedFlowStore } = useAppStores();
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const isWaiting = exchanges.some((exchange) => exchange.reply === undefined);

  const update = (id: number, change: (exchange: Exchange) => Exchange) => {
    setExchanges((current) =>
      current.map((exchange) => (exchange.id === id ? change(exchange) : exchange)),
    );
  };

  /** A new flow with no nodes is saved first, so the agent can build it from scratch. */
  const ask = async (goal: string) => {
    const id = exchanges.length;
    setExchanges((current) => [...current, { id, goal, live: "" }]);
    const controller = new AbortController();
    const run = async (): Promise<AgentResult<AgentAnswer>> => {
      const flowId = await savedFlowStore.getState().saveNow();
      if (controller.signal.aborted) return err({ code: "TIMEOUT" });
      if (flowId === undefined) return err({ code: "UNAUTHENTICATED" });
      return agent.ask({ goal, flowId }, controller.signal, (progress) => {
        if (!controller.signal.aborted) update(id, (exchange) => withProgress(exchange, progress));
      });
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<AgentResult<AgentAnswer>>((resolve) => {
      timer = setTimeout(() => {
        resolve(err({ code: "TIMEOUT" }));
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
    });
    const reply = await Promise.race([run(), timeout])
      .catch((): AgentResult<AgentAnswer> => err({ code: "UNAVAILABLE" }))
      .finally(() => {
        clearTimeout(timer);
      });
    update(id, (exchange) => ({ ...exchange, reply }));
  };

  return { exchanges, isWaiting, ask };
}
