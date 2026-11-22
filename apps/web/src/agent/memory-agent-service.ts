import { err, ok } from "@nodomics/protocol";
import { MESSAGES } from "../messages.ts";
import type { AgentService } from "./agent-service.ts";

/** Stands in when no agent URL is configured: it answers so, and never proposes changes. */
export function createMemoryAgentService(): AgentService {
  return {
    ask: () => Promise.resolve(ok({ summary: MESSAGES.agent.notConfigured })),
    decide: () => Promise.resolve(err({ code: "NOT_FOUND" })),
  };
}
