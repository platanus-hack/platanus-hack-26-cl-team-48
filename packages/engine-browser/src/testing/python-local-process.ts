import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { createPeer, createWebSocketTransport, type RpcPeer } from "@nodomics/rpc";
import { WebSocket } from "ws";

const ENGINE_DIRECTORY = fileURLToPath(
  new URL("../../../../engines/python-local/", import.meta.url),
);
const ENGINE_BINARY = `${ENGINE_DIRECTORY}.venv/bin/nodomics-engine`;
const ORIGIN = "http://localhost:5173";
const STARTUP_TIMEOUT_MS = 60_000;
const LOOPBACK = "127.0.0.1";

export const isPythonLocalInstalled = existsSync(ENGINE_BINARY);

export type PythonLocalProcess = {
  readonly peer: RpcPeer;
  readonly url: string;
  readonly stop: () => Promise<void>;
};

export async function startPythonLocal(): Promise<PythonLocalProcess> {
  const child = spawn(
    ENGINE_BINARY,
    ["--port", String(await reservePort()), "--allow-origin", ORIGIN],
    { cwd: ENGINE_DIRECTORY, env: { ...process.env, PYTHONUNBUFFERED: "1" } },
  );
  const stop = (): Promise<void> => stopProcess(child);
  try {
    const url = await readConnectionUrl(child);
    return { peer: await connect(url), url, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

async function reservePort(): Promise<number> {
  const server = createServer();
  server.listen(0, LOOPBACK);
  await once(server, "listening");
  const address = server.address();
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });
  if (address === null || typeof address === "string") throw new Error("Missing TCP port");
  return address.port;
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
}

function readConnectionUrl(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Python engine startup timed out: ${output}`));
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

// The CLI prints its token before binding, so refused connections are retried during startup.
async function connect(url: string): Promise<RpcPeer> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  for (;;) {
    const socket = new WebSocket(url, { origin: ORIGIN });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
      });
      return createPeer(createWebSocketTransport(socket));
    } catch (error) {
      socket.close();
      if (Date.now() >= deadline || !String(error).includes("ECONNREFUSED")) throw error;
    }
  }
}
