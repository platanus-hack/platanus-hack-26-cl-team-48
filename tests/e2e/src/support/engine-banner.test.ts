import { describe, expect, it } from "vitest";
import { readConnectAddress } from "./engine-banner.ts";

describe("readConnectAddress", () => {
  it("finds the address the local engine prints on start", () => {
    const banner =
      "Nodomics local engine listening on ws://127.0.0.1:7400\n" +
      "Connect with: ws://127.0.0.1:7400/?token=abc_DEF-1\n";

    expect(readConnectAddress(banner)).toBe("ws://127.0.0.1:7400/?token=abc_DEF-1");
  });

  it("returns undefined until the banner line is complete", () => {
    expect(readConnectAddress("Connect with: ws://127.0.0.1:7400/?tok")).toBeUndefined();
  });
});
