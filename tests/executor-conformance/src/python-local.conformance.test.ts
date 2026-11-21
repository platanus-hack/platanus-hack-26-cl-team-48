import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { createPeer, createWebSocketTransport, type RpcPeer } from "@nodomics/rpc";
import { afterAll, describe } from "vitest";
import { WebSocket } from "ws";
import { describeExecutorConformance } from "./executor-conformance.ts";
import { createExecutorPeer } from "./python-local-peer.ts";

const ENGINE_DIRECTORY = fileURLToPath(new URL("../../../engines/python-local/", import.meta.url));
const ENGINE_BINARY = `${ENGINE_DIRECTORY}.venv/bin/nodomics-engine`;
const ORIGIN = "http://localhost:5173";
const STARTUP_TIMEOUT_MS = 15_000;
const LOOPBACK = "127.0.0.1";

async function reservePort(): Promise<number> {
  const server = createServer();
  server.listen(0, LOOPBACK);
  try {
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("Missing TCP port");
    return address.port;
  } finally {
    if (server.listening)
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
  }
}

async function stopEngine(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
}

async function startEngine(port: number): Promise<{ child: ChildProcess; url: string }> {
  const child = spawn(ENGINE_BINARY, ["--port", String(port), "--allow-origin", ORIGIN], {
    cwd: ENGINE_DIRECTORY,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  try {
    return { child, url: await readConnectionUrl(child) };
  } catch (error) {
    await stopEngine(child);
    throw error;
  }
}

function readConnectionUrl(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error("Python engine startup timed out"));
    }, STARTUP_TIMEOUT_MS);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const url = /Connect with: (ws:\/\/[^\s]+)\r?\n/u.exec(output)?.[1];
      if (url !== undefined) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error(`Python engine exited before connecting: ${output}`));
    });
  });
}

async function connect(url: string): Promise<RpcPeer> {
  // The CLI prints its token before bind; retry only refused connections during startup.
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  for (;;) {
    const socket = new WebSocket(url, { origin: ORIGIN, handshakeTimeout: STARTUP_TIMEOUT_MS });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener(
          "open",
          () => {
            resolve();
          },
          { once: true },
        );
        socket.addEventListener(
          "error",
          (event) => {
            reject(
              new Error("message" in event ? String(event.message) : "WebSocket connection failed"),
            );
          },
          { once: true },
        );
      });
      return createPeer(createWebSocketTransport(socket));
    } catch (error) {
      socket.close();
      if (Date.now() >= deadline || !String(error).includes("ECONNREFUSED")) throw error;
    }
  }
}

async function checkAvailability(): Promise<{ port?: number; reason?: string }> {
  if (!existsSync(ENGINE_BINARY))
    return { reason: "Python local binary unavailable; install engines/python-local first" };
  try {
    const port = await reservePort();
    const probe = spawnSync(ENGINE_BINARY, ["--help"], {
      timeout: STARTUP_TIMEOUT_MS,
      encoding: "utf8",
    });
    if (probe.error && "code" in probe.error && probe.error.code === "ENOENT") {
      return { reason: "Python local skipped: Python interpreter unavailable" };
    }
    if (probe.error || probe.status !== 0)
      throw new Error(`Python engine probe failed: ${probe.stderr}`, { cause: probe.error });
    return { port };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ["EPERM", "EACCES"].includes(String(error.code))
    ) {
      return {
        reason: `Python local skipped: sandbox cannot open loopback ports (${String(error.code)})`,
      };
    }
    throw error;
  }
}

const availability = await checkAvailability();
describe.skipIf(availability.reason !== undefined)(availability.reason ?? "Python local", () => {
  const context: { child?: ChildProcess; peer?: RpcPeer } = {};
  afterAll(async () => {
    context.peer?.close();
    if (context.child !== undefined) await stopEngine(context.child);
  });
  describeExecutorConformance({
    name: "Python local",
    runtimes: ["sql", "python"],
    create: async () => {
      if (availability.port === undefined) throw new Error("No available TCP port");
      const engine = await startEngine(availability.port);
      context.child = engine.child;
      context.peer = await connect(engine.url);
      return createExecutorPeer(context.peer);
    },
  });
});
