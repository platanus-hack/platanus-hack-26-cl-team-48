import { useState } from "react";
import { useAppStores } from "../app-context.ts";
import { useAgent } from "./agent-context.ts";
import type { AgentAnswer, AgentResult } from "./agent-service.ts";

export type Exchange = {
  readonly id: number;
  readonly goal: string;
  readonly reply?: AgentResult<AgentAnswer>;
};

/** The user's requests to the agent about one saved flow, each with its reply once it arrives. */
export function useAgentConversation() {
  const agent = useAgent();
  const { savedFlowStore } = useAppStores();
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const isWaiting = exchanges.some((exchange) => exchange.reply === undefined);

  const ask = async (goal: string, flowId: string) => {
    const id = exchanges.length;
    setExchanges((current) => [...current, { id, goal }]);
    await savedFlowStore.getState().flushPending();
    const reply = await agent.ask({ goal, flowId });
    setExchanges((current) =>
      current.map((exchange) => (exchange.id === id ? { ...exchange, reply } : exchange)),
    );
  };

  return { exchanges, isWaiting, ask };
}
