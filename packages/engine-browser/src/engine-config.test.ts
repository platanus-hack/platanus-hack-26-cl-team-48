import { describe, expect, it } from "vitest";
import { readEngineConfig } from "./engine-config.ts";

describe("readEngineConfig", () => {
  it("defaults to the browser engine", () => {
    expect(readEngineConfig("")).toEqual({ ok: true, value: { mode: "browser" } });
  });

  it("adds the encoded token to the local WebSocket URL", () => {
    expect(readEngineConfig("?local=ws%3A%2F%2F127.0.0.1%3A7341%2F&token=a%2Bb%26c")).toEqual({
      ok: true,
      value: { mode: "local", url: "ws://127.0.0.1:7341/?token=a%2Bb%26c" },
    });
  });

  it.each(["127.0.0.1", "localhost", "[::1]"])("accepts loopback host %s", (host) => {
    expect(readEngineConfig(`?local=ws://${host}:7341/&token=x`)).toEqual({
      ok: true,
      value: { mode: "local", url: `ws://${host}:7341/?token=x` },
    });
  });

  it.each(["attacker.example", "localhost.attacker.example", "192.168.1.1", "[::2]"])(
    "returns an error value for non-loopback host %s",
    (host) => {
      expect(readEngineConfig(`?local=wss://${host}/&token=x`)).toEqual({
        ok: false,
        error: "Local executor host must be loopback",
      });
    },
  );

  it.each([
    "?token=secret",
    "?local=",
    "?local=bad&token=x",
    "?local=https://localhost&token=x",
    "?local=ws://localhost/",
    "?local=ws://localhost/&token=",
    "?local=ws://user:pass@localhost/&token=x",
    "?local=ws://localhost/%23fragment&token=x",
    "?local=ws://localhost/&token=x&token=y",
    "?local=ws://localhost/&local=ws://other/&token=x",
  ])("returns an error value for invalid configuration %s", (search) => {
    expect(readEngineConfig(search).ok).toBe(false);
  });

  it("replaces an existing URL token and preserves other query parameters", () => {
    expect(
      readEngineConfig(`?local=${encodeURIComponent("wss://localhost/?token=old&x=1")}&token=new`),
    ).toEqual({
      ok: true,
      value: { mode: "local", url: "wss://localhost/?token=new&x=1" },
    });
  });
});
