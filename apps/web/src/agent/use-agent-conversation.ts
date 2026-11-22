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

  const ask = async (goal: string, flowId: string) => {
    const id = exchanges.length;
    setExchanges((current) => [...current, { id, goal, live: "" }]);
    await savedFlowStore.getState().flushPending();
    const reply = await agent.ask({ goal, flowId }, undefined, (progress) => {
      update(id, (exchange) => withProgress(exchange, progress));
    });
    update(id, (exchange) => ({ ...exchange, reply }));
  };

  return { exchanges, isWaiting, ask };
}
