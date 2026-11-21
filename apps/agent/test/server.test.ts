import { once } from "node:events";
import { Duplex } from "node:stream";
import { expect, it } from "vitest";
import { createServer } from "../src/server.ts";

async function request(method: string, path: string): Promise<string> {
  const chunks: Buffer[] = [];
  const socket = new Duplex({
    read() {},
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk);
      done();
    },
  });
  const completed = once(socket, "finish");
  createServer({ handleRequest: () => Promise.reject(new Error("unused")) }).emit("connection", socket);
  socket.push(`${method} ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
  await completed;
  return Buffer.concat(chunks).toString();
}

it('GET /health returns 200 {status:"ok"}', async () => {
  const response = await request("GET", "/health");

  expect(response).toMatch(/^HTTP\/1\.1 200 /);
  expect(response).toMatch(/\r\nContent-Type: application\/json\r\n/i);
  expect(response.split("\r\n\r\n")[1]).toBe('{"status":"ok"}');
});

it("unknown route returns 404", async () => {
  const response = await request("GET", "/unknown");

  expect(response).toMatch(/^HTTP\/1\.1 404 /);
  expect(response).toMatch(/\r\nContent-Type: application\/json\r\n/i);
  expect(response.split("\r\n\r\n")[1]).toBe('{"error":"not_found"}');
});

it("a different HTTP method cannot use the health route", async () => {
  expect(await request("POST", "/health")).toMatch(/^HTTP\/1\.1 404 /);
});
