import { MESSAGES } from "../messages.ts";
import type { AgentErrorCode } from "./agent-service.ts";

const errors = MESSAGES.agent.errors;

export function agentErrorMessage(code: AgentErrorCode): string {
  switch (code) {
    case "STALE":
    case "RATE_LIMITED":
    case "TIMEOUT":
    case "UNAUTHENTICATED":
      return errors[code];
    case "NOT_FOUND":
    case "UNAVAILABLE":
    case "INVALID":
      return errors.generic;
  }
}
