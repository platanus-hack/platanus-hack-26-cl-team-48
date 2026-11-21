import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { connect, createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { APP_ORIGIN } from "./app-origin.ts";
import { readConnectAddress } from "./engine-banner.ts";

const ENGINE_DIRECTORY = fileURLToPath(
  new URL("../../../../engines/python-local/", import.meta.url),
);
const ENGINE_BINARY = `${ENGINE_DIRECTORY}.venv/bin/nodomics-engine`;
const LOOPBACK = "127.0.0.1";
// The first Python import after `uv sync` compiles pandas and DuckDB and can take about a minute.
const STARTUP_TIMEOUT_MS = 120_000;
const CONNECT_RETRY_MS = 100;

export const isLocalEngineInstalled = (): boolean => existsSync(ENGINE_BINARY);

export const LOCAL_ENGINE_MISSING =
  "engines/python-local/.venv is missing; run `cd engines/python-local && uv sync`";

export type LocalEngine = {
  /** Includes the secret token: never log it. */
  readonly address: string;
  readonly stop: () => Promise<void>;
};

/** Starts `nodomics-engine` on a free loopback port, accepting the app's origin. */
export async function startLocalEngine(): Promise<LocalEngine> {
  const port = await reserveFreePort();
  const child = spawn(ENGINE_BINARY, ["--port", String(port), "--allow-origin", APP_ORIGIN], {
    cwd: ENGINE_DIRECTORY,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  const stop = () => stopProcess(child);
  try {
    const address = await waitForAddress(child);
    await waitUntilListening(port);
    return { address, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

async function reserveFreePort(): Promise<number> {
  const server = createServer().listen(0, LOOPBACK);
  await once(server, "listening");
  const address = server.address();
  server.close();
  await once(server, "close");
  if (address === null || typeof address === "string") throw new Error("No free TCP port");
  return address.port;
}

/** Resolves with the "Connect with:" address; errors never include the output, which has the token. */
function waitForAddress(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const output: string[] = [];
    const timeout = setTimeout(() => {
      reject(new Error("The local engine did not print its address in time"));
    }, STARTUP_TIMEOUT_MS);
    child.stdout?.on("data", (chunk: Buffer) => {
      output.push(chunk.toString());
      const address = readConnectAddress(output.join(""));
      if (address === undefined) return;
      clearTimeout(timeout);
      resolve(address);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`The local engine exited with code ${String(code)} before listening`));
    });
  });
}

// The engine prints its address before it binds the port.
async function waitUntilListening(port: number): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await canConnect(port))) {
    if (Date.now() > deadline) throw new Error("The local engine did not open its port in time");
    await delay(CONNECT_RETRY_MS);
  }
}

async function canConnect(port: number): Promise<boolean> {
  const socket = connect(port, LOOPBACK);
  try {
    await once(socket, "connect");
    return true;
  } catch {
    return false;
  } finally {
    socket.destroy();
  }
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}
