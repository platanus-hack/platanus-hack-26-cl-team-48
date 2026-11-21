import { once } from "node:events";
import { Duplex } from "node:stream";
import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createRateLimiter, type RateLimiter } from "../src/http/guards/rate-limit.ts";
import type { Route } from "../src/http/route.ts";
import { createRouter } from "../src/http/router.ts";
import type { LlmPort } from "../src/llm/llm-port.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import { createHandleRequest } from "../src/requests/handle-request.ts";
import type { IdentityPort } from "../src/requests/identity.ts";
import { createServer } from "../src/server.ts";

const RATE_LIMITED = { status: 429, body: { error: "rate_limit_exceeded" } };
const TOKENS_BY_USER: Record<string, string> = {
  "token-a1": "user-a",
  "token-a2": "user-a",
  "token-b": "user-b",
};

const identity: IdentityPort = {
  resolve: (bearer) => {
    const userId = bearer === undefined ? undefined : TOKENS_BY_USER[bearer];
    return Promise.resolve(
      userId === undefined
        ? err({ code: "UNAUTHORIZED" as const, message: "Invalid token" })
        : ok({ userId, accessToken: bearer ?? "" }),
    );
  },
};

const bearer = (token: string) => `Bearer ${token}`;
const body = JSON.stringify({ goal: "hola" });

function countingLlm() {
  const state = { calls: 0 };
  const llm: LlmPort = {
    complete: () => {
      state.calls += 1;
      return Promise.resolve(ok({ kind: "text" as const, text: "listo" }));
    },
  };
  return { llm, state };
}

function recordingLimiter(allowed: boolean) {
  const keys: string[] = [];
  const limiter: RateLimiter = {
    check: (key) => {
      keys.push(key);
      return allowed;
    },
    isAllowed: () => allowed,
  };
  return { limiter, keys };
}

function requestHandler(rateLimiter: RateLimiter) {
  const { llm, state } = countingLlm();
  const handle = createHandleRequest({ identity, llm, mcp: createFakeMcp(), rateLimiter });
  return { handle, state };
}

function routerWith(rateLimiter: RateLimiter) {
  const state = { calls: 0 };
  const route: Route = {
    method: "GET",
    path: "/agent/search",
    handle: () => {
      state.calls += 1;
      return Promise.resolve({ status: 200, body: { ok: true } });
    },
  };
  return { router: createRouter({ identity, routes: [route], rateLimiter }), state };
}

const get = (token: string | undefined) => ({
  method: "GET",
  url: "/agent/search",
  authorization: token === undefined ? undefined : bearer(token),
  rawBody: "",
});

describe("handleRequest rate limit", () => {
  it("answers 429 and skips the loop when the user exceeds the budget", async () => {
    const { handle, state } = requestHandler(createRateLimiter({ perMinute: 1 }));
    await handle({ authorization: bearer("token-a1"), rawBody: body });

    const reply = await handle({ authorization: bearer("token-a1"), rawBody: body });

    expect(reply).toEqual(RATE_LIMITED);
    expect(state.calls).toBe(1);
  });

  it("keys the budget by the resolved userId, not the raw header", async () => {
    const { limiter, keys } = recordingLimiter(true);
    const { handle } = requestHandler(limiter);

    await handle({ authorization: bearer("token-a1"), rawBody: body });
    await handle({ authorization: bearer("token-a2"), rawBody: body });

    expect(keys).toEqual(["user-a", "user-a"]);
  });

  it("shares the budget between two tokens of the same user", async () => {
    const { handle } = requestHandler(createRateLimiter({ perMinute: 1 }));
    await handle({ authorization: bearer("token-a1"), rawBody: body });

    const reply = await handle({ authorization: bearer("token-a2"), rawBody: body });

    expect(reply).toEqual(RATE_LIMITED);
  });

  it("does not share the budget between different users", async () => {
    const { handle } = requestHandler(createRateLimiter({ perMinute: 1 }));
    await handle({ authorization: bearer("token-a1"), rawBody: body });

    const reply = await handle({ authorization: bearer("token-b"), rawBody: body });

    expect(reply.status).toBe(200);
  });

  it("answers 401 for an invalid token without consuming budget", async () => {
    const { limiter, keys } = recordingLimiter(true);
    const { handle } = requestHandler(limiter);

    const replies = await Promise.all([
      handle({ authorization: bearer("forged-1"), rawBody: body }),
      handle({ authorization: undefined, rawBody: body }),
    ]);

    expect(replies.map((reply) => reply.status)).toEqual([401, 401]);
    expect(keys).toEqual([]);
  });

  it("lets a valid user through after many invalid attempts", async () => {
    const { handle } = requestHandler(createRateLimiter({ perMinute: 1 }));
    for (let i = 0; i < 5; i++) {
      await handle({ authorization: bearer(`forged-${String(i)}`), rawBody: body });
    }

    const reply = await handle({ authorization: bearer("token-a1"), rawBody: body });

    expect(reply.status).toBe(200);
  });
});

describe("router rate limit", () => {
  it("answers 429 and skips the route when the user exceeds the budget", async () => {
    const { router, state } = routerWith(createRateLimiter({ perMinute: 1 }));
    await router.dispatch(get("token-a1"));

    const reply = await router.dispatch(get("token-a1"));

    expect(reply).toEqual(RATE_LIMITED);
    expect(state.calls).toBe(1);
  });

  it("keys the budget by the resolved userId, not the raw header", async () => {
    const { limiter, keys } = recordingLimiter(true);
    const { router } = routerWith(limiter);

    await router.dispatch(get("token-a1"));
    await router.dispatch(get("token-a2"));

    expect(keys).toEqual(["user-a", "user-a"]);
  });

  it("shares the budget between two tokens of the same user", async () => {
    const { router } = routerWith(createRateLimiter({ perMinute: 1 }));
    await router.dispatch(get("token-a1"));

    const reply = await router.dispatch(get("token-a2"));

    expect(reply).toEqual(RATE_LIMITED);
  });

  it("does not share the budget between different users", async () => {
    const { router } = routerWith(createRateLimiter({ perMinute: 1 }));
    await router.dispatch(get("token-a1"));

    const reply = await router.dispatch(get("token-b"));

    expect(reply).toEqual({ status: 200, body: { ok: true } });
  });

  it("answers 401 for an invalid token without consuming budget", async () => {
    const { limiter, keys } = recordingLimiter(true);
    const { router } = routerWith(limiter);

    const replies = await Promise.all([
      router.dispatch(get("forged")),
      router.dispatch(get(undefined)),
    ]);

    expect(replies).toEqual([
      { status: 401, body: { error: "unauthorized" } },
      { status: 401, body: { error: "unauthorized" } },
    ]);
    expect(keys).toEqual([]);
  });

  it("works unchanged when no rate limiter is given", async () => {
    const route: Route = {
      method: "GET",
      path: "/agent/search",
      handle: () => Promise.resolve({ status: 200, body: { ok: true } }),
    };
    const router = createRouter({ identity, routes: [route] });

    const replies = await Promise.all(
      Array.from({ length: 10 }, () => router.dispatch(get("token-a1"))),
    );

    expect(replies.every((reply) => reply?.status === 200)).toBe(true);
  });
});

describe("server no longer limits by the authorization header", () => {
  async function postStatus(server: ReturnType<typeof createServer>, token: string) {
    const chunks: Buffer[] = [];
    const socket = new Duplex({
      read() {},
      write(chunk: Buffer, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    });
    const completed = once(socket, "finish");
    server.emit("connection", socket);
    socket.push(
      `POST /agent/requests HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nAuthorization: ${bearer(token)}\r\n` +
        `Content-Type: application/json\r\nContent-Length: ${String(Buffer.byteLength(body))}\r\n\r\n${body}`,
    );
    await completed;
    return Number(/^HTTP\/1\.1 (\d+)/.exec(Buffer.concat(chunks).toString())?.[1]);
  }

  it("lets a user exceed six requests when their own budget allows it", async () => {
    const { llm } = countingLlm();
    const handleRequest = createHandleRequest({
      identity,
      llm,
      mcp: createFakeMcp(),
      rateLimiter: createRateLimiter({ perMinute: 100 }),
    });
    const server = createServer({ handleRequest });

    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) statuses.push(await postStatus(server, "token-a1"));

    expect(statuses).toEqual(Array<number>(8).fill(200));
  });

  it("returns the user's 429 through the HTTP layer", async () => {
    const { llm } = countingLlm();
    const handleRequest = createHandleRequest({
      identity,
      llm,
      mcp: createFakeMcp(),
      rateLimiter: createRateLimiter({ perMinute: 1 }),
    });
    const server = createServer({ handleRequest });
    await postStatus(server, "token-a1");

    expect(await postStatus(server, "token-a2")).toBe(429);
  });
});
