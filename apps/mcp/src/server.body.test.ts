import { request as httpRequest, type Server } from "node:http";
import { ok } from "@nodomics/protocol";
import { afterEach, describe, expect, it } from "vitest";
import type { IdentityPort, UserIdentity } from "./identity.ts";
import { createMcpServer } from "./server.ts";
import type { Tools } from "./tools.ts";

const USER: UserIdentity = { userId: "user", accessToken: "valid-token" };
const MIN_TEXT_BYTES = 200 * 1024;
// Odd size, so the pieces fall inside the two- and three-byte characters of the text.
const PIECE_BYTES = 16_381;
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => {
            resolve();
          });
        }),
    ),
  );
});

async function startRecordingServer() {
  const calls: unknown[] = [];
  const identity: IdentityPort = { resolve: () => Promise.resolve(ok(USER)) };
  const tools: Tools = {
    list: () => [],
    call: (_name, args) => {
      calls.push(args);
      return Promise.resolve(ok({ received: true }));
    },
  };
  const server = createMcpServer({ tools, identity });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("No HTTP address");
  return { port: address.port, calls };
}

function multibyteText() {
  const pattern = "año útil — señal €ñ ";
  return pattern.repeat(Math.ceil(MIN_TEXT_BYTES / Buffer.byteLength(pattern)) + 1);
}

const isSameArguments = (received: unknown, sent: unknown) =>
  JSON.stringify(received) === JSON.stringify(sent);

const countReplacementCharacters = (received: unknown) =>
  (JSON.stringify(received).match(/\uFFFD/g) ?? []).length;

function isInsideCharacter(bytes: Buffer, offset: number) {
  return ((bytes[offset] ?? 0) & 0xc0) === 0x80;
}

function splitInsideCharacters(bytes: Buffer): readonly Buffer[] {
  const pieces: Buffer[] = [];
  for (let start = 0; start < bytes.length; start += PIECE_BYTES) {
    pieces.push(bytes.subarray(start, start + PIECE_BYTES));
  }
  if (!pieces.slice(1).some((piece) => isInsideCharacter(piece, 0))) {
    throw new Error("No piece starts inside a multibyte character");
  }
  return pieces;
}

async function postInPieces(port: number, pieces: readonly Buffer[]) {
  await new Promise<void>((resolve, reject) => {
    const request = httpRequest(
      {
        host: "127.0.0.1",
        port,
        path: "/mcp",
        method: "POST",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "Content-Length": String(pieces.reduce((total, piece) => total + piece.length, 0)),
        },
      },
      (response) => {
        response.resume();
        response.on("end", resolve);
      },
    );
    request.on("error", reject);
    void writePieces(request, pieces).then(() => request.end());
  });
}

async function writePieces(request: ReturnType<typeof httpRequest>, pieces: readonly Buffer[]) {
  for (const piece of pieces) {
    await new Promise<void>((resolve) =>
      request.write(piece, () => {
        resolve();
      }),
    );
  }
}

describe("MCP HTTP server request body", () => {
  it("delivers multibyte text split across body chunks intact to the tool", async () => {
    const { port, calls } = await startRecordingServer();
    const text = multibyteText();
    const body = Buffer.from(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "flows.get", arguments: { text } },
      }),
    );

    await postInPieces(port, splitInsideCharacters(body));

    expect(calls).toHaveLength(1);
    expect(
      isSameArguments(calls[0], { text }),
      `received ${String(countReplacementCharacters(calls[0]))} replacement characters`,
    ).toBe(true);
  });
});
