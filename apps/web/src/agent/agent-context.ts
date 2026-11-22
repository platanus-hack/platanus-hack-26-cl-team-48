import { createContext, useContext } from "react";
import type { AgentService } from "./agent-service.ts";

/** The agent of this app instance, injected by the composition root. */
export const AgentContext = createContext<AgentService | undefined>(undefined);

export function useAgent(): AgentService {
  const agent = useContext(AgentContext);
  if (agent === undefined) throw new Error("useAgent must be used inside an AgentContext provider");
  return agent;
}
