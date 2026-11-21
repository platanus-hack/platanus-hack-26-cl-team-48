import { describe, expect, it } from "vitest";
import { parseLocalAddress } from "./local-address.ts";

describe("parseLocalAddress", () => {
  it.each(["127.0.0.1", "localhost", "[::1]"])(
    "parses loopback %s and separates the token",
    (host) => {
      expect(parseLocalAddress(`ws://${host}:7341/?token=a%2Bb%26c`)).toEqual({
        ok: true,
        value: { url: `ws://${host}:7341/`, token: "a+b&c" },
      });
    },
  );

  it.each([
    "ws://127.0.0.1:7341/",
    "ws://127.0.0.1/?token=%20",
    "ws://example.com/?token=x",
    "https://localhost/?token=x",
    "not a URL",
    "ws://localhost/?token=a&token=b",
    "ws://user@localhost/?token=x",
    "ws://localhost/?token=x#fragment",
  ])("returns an error value for %s", (address) => {
    expect(parseLocalAddress(address).ok).toBe(false);
  });
});
