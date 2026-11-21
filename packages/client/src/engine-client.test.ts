import {
  NepErrorCode,
  PROTOCOL_VERSION,
  type Capabilities,
  type NepEvent,
  type ValidationIssue,
} from "@nodomics/protocol";
import { createMemoryTransportPair, createPeer, JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { createEngineClient, type EngineClientOptions } from "./engine-client.ts";
import { EngineClientError } from "./engine-client-error.ts";

const capabilities = (protocol: string): Capabilities => ({
  protocol,
  engine: "mock",
  runtimes: ["sql"],
  sources: ["url"],
});

const nodeStatus = { rev: 1, runId: "r1", nodeId: "n1", state: "running" };
const invalidNodeStatus = { ...nodeStatus, state: "exploded" };

const connectedToFakeEngine = (options: EngineClientOptions = {}) => {
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  return { client: createEngineClient(clientEnd, options), engine: createPeer(engineEnd) };
};

const nextEventOf = (client: ReturnType<typeof createEngineClient>, event: NepEvent) =>
  new Promise((resolve) => client.on(event, resolve));

describe("createEngineClient", () => {
  describe("request", () => {
    it("resolves with the engine's result when it matches the method's schema", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("flow.run", () => ({ runId: "r1" }));

      await expect(client.request("flow.run", { rev: 1 })).resolves.toEqual({ runId: "r1" });
    });

    it("sends the method and params to the engine", async () => {
      const { client, engine } = connectedToFakeEngine();
      const received = new Promise((resolve) => {
        engine.handle("run.cancel", (params) => {
          resolve(params);
          return {};
        });
      });

      await client.request("run.cancel", { runId: "r9" });

      await expect(received).resolves.toEqual({ runId: "r9" });
    });

    it("rejects with INVALID_RESPONSE and the issues when the result does not match the schema", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("flow.run", () => ({ runId: 42 }));

      const error: unknown = await client.request("flow.run", { rev: 1 }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(EngineClientError);
      expect(error).toMatchObject({
        code: "INVALID_RESPONSE",
        issues: [expect.objectContaining({ path: "/runId" })],
      });
    });

    it("rejects with the engine's NEP error code", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("data.page", () => {
        throw new RpcError(NepErrorCode.RESULT_EXPIRED, "Result expired");
      });

      await expect(
        client.request("data.page", { ref: "ref-1", offset: 0, limit: 10 }),
      ).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
    });

    it("rejects with the JSON-RPC code when the engine does not know the method", async () => {
      const { client } = connectedToFakeEngine();

      await expect(client.request("nodes.list", {})).rejects.toBeInstanceOf(RpcError);
      await expect(client.request("nodes.list", {})).rejects.toMatchObject({
        code: JsonRpcErrorCode.METHOD_NOT_FOUND,
      });
    });
  });

  describe("on", () => {
    it("delivers events that match the event's schema", async () => {
      const { client, engine } = connectedToFakeEngine();
      const received = nextEventOf(client, "node.status");

      engine.notify("node.status", nodeStatus);

      await expect(received).resolves.toEqual(nodeStatus);
    });

    it("discards events that do not match the event's schema", async () => {
      const { client, engine } = connectedToFakeEngine();
      const seen: unknown[] = [];
      client.on("node.status", (payload) => seen.push(payload));
      const valid = nextEventOf(client, "node.status");

      engine.notify("node.status", invalidNodeStatus);
      engine.notify("node.status", nodeStatus);
      await valid;

      expect(seen).toEqual([nodeStatus]);
    });

    it("reports discarded events to onInvalidEvent with their issues", async () => {
      const discarded: { event: NepEvent; issues: readonly ValidationIssue[] }[] = [];
      const { client, engine } = connectedToFakeEngine({
        onInvalidEvent: (event, issues) => discarded.push({ event, issues }),
      });
      const valid = nextEventOf(client, "node.status");

      engine.notify("node.status", invalidNodeStatus);
      engine.notify("node.status", nodeStatus);
      await valid;

      expect(discarded).toEqual([
        { event: "node.status", issues: [expect.objectContaining({ path: "/state" })] },
      ]);
    });

    it("stops delivering events after unsubscribing", async () => {
      const { client, engine } = connectedToFakeEngine();
      const seen: unknown[] = [];
      const unsubscribe = client.on("node.status", (payload) => seen.push(payload));
      const later = nextEventOf(client, "node.status");

      unsubscribe();
      engine.notify("node.status", nodeStatus);
      await later;

      expect(seen).toEqual([]);
    });
  });

  describe("connect", () => {
    it("says hello with the protocol version and client identity", async () => {
      const { client, engine } = connectedToFakeEngine();
      const hello = new Promise((resolve) => {
        engine.handle("engine.hello", (params) => {
          resolve(params);
          return capabilities(PROTOCOL_VERSION);
        });
      });

      await client.connect({ client: "web", token: "secret" });

      await expect(hello).resolves.toEqual({
        protocol: PROTOCOL_VERSION,
        client: "web",
        token: "secret",
      });
    });

    it("returns the engine's capabilities when the protocol version is compatible", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("engine.hello", () => capabilities(`${PROTOCOL_VERSION}.7`));

      await expect(client.connect({ client: "web" })).resolves.toEqual({
        ok: true,
        value: capabilities(`${PROTOCOL_VERSION}.7`),
      });
    });

    it("returns PROTOCOL_MISMATCH as a value when the protocol version is incompatible", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("engine.hello", () => capabilities("99.0"));

      await expect(client.connect({ client: "web" })).resolves.toEqual({
        ok: false,
        error: { code: "PROTOCOL_MISMATCH", expected: PROTOCOL_VERSION, received: "99.0" },
      });
    });

    it("returns PROTOCOL_MISMATCH as a value when the engine rejects the hello for its version", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("engine.hello", () => {
        throw new RpcError(NepErrorCode.PROTOCOL_MISMATCH, "Unsupported protocol", "2.0");
      });

      await expect(client.connect({ client: "web" })).resolves.toEqual({
        ok: false,
        error: { code: "PROTOCOL_MISMATCH", expected: PROTOCOL_VERSION, received: "2.0" },
      });
    });

    it("reports an unknown received version when the engine's rejection does not name it", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("engine.hello", () => {
        throw new RpcError(NepErrorCode.PROTOCOL_MISMATCH, "Unsupported protocol", { v: 2 });
      });

      await expect(client.connect({ client: "web" })).resolves.toEqual({
        ok: false,
        error: { code: "PROTOCOL_MISMATCH", expected: PROTOCOL_VERSION, received: "unknown" },
      });
    });

    it("returns UNAUTHORIZED as a value when the engine rejects the token", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("engine.hello", () => {
        throw new RpcError(NepErrorCode.UNAUTHORIZED, "Invalid token");
      });

      await expect(client.connect({ client: "web", token: "bad" })).resolves.toEqual({
        ok: false,
        error: { code: "UNAUTHORIZED" },
      });
    });

    it("rejects with any other engine error", async () => {
      const { client, engine } = connectedToFakeEngine();
      engine.handle("engine.hello", () => {
        throw new RpcError(JsonRpcErrorCode.INTERNAL_ERROR, "Boom");
      });

      await expect(client.connect({ client: "web" })).rejects.toMatchObject({
        code: JsonRpcErrorCode.INTERNAL_ERROR,
      });
    });
  });

  describe("close", () => {
    it("rejects later requests because the connection is closed", async () => {
      const { client } = connectedToFakeEngine();

      client.close();

      await expect(client.request("nodes.list", {})).rejects.toMatchObject({
        code: JsonRpcErrorCode.CONNECTION_CLOSED,
      });
    });

    it("closes the transport", () => {
      const [clientEnd] = createMemoryTransportPair();
      const closed: boolean[] = [];
      const client = createEngineClient({
        ...clientEnd,
        close: () => {
          closed.push(true);
          clientEnd.close();
        },
      });

      client.close();

      expect(closed).toEqual([true]);
    });
  });
});
