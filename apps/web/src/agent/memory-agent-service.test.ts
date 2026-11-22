import { describe, expect, it } from "vitest";
import { createMemoryAgentService } from "./memory-agent-service.ts";

describe("createMemoryAgentService", () => {
  it("answers that the agent is not configured", async () => {
    const service = createMemoryAgentService();

    const result = await service.ask({ goal: "Explica el flujo", flowId: "flow-1" });

    expect(result.ok && result.value.summary).toMatch(/no está configurado/i);
  });

  it("never proposes changes", async () => {
    const service = createMemoryAgentService();

    const result = await service.ask({ goal: "Agrega un filtro", flowId: "flow-1" });

    expect(result.ok && result.value.proposal).toBeUndefined();
  });

  it("has no proposal to decide on", async () => {
    const service = createMemoryAgentService();

    const result = await service.decide("proposal-1", { acceptedIds: [], version: 1 });

    expect(result.ok).toBe(false);
  });
});
