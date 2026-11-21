import type { EngineClient } from "@nodomics/client";
import type { DisplayRef } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { checkDisplays } from "./check-displays.ts";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const figure: DisplayRef = { id: "d1", mime: "image/png", width: 400, height: 300, title: "T" };

const clientServing = (bytes: number[]) =>
  ({
    request: () => Promise.resolve({ mime: "image/png", bytes: new Uint8Array(bytes) }),
  }) as unknown as EngineClient;

describe("checkDisplays", () => {
  it("accepts figures of the expected size and title whose bytes are a PNG", async () => {
    await expect(
      checkDisplays(
        clientServing(PNG_SIGNATURE),
        [figure],
        [{ width: 400, height: 300, title: "T" }],
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects a different number or size of figures", async () => {
    await expect(
      checkDisplays(clientServing(PNG_SIGNATURE), [figure], [{ width: 10, height: 300 }]),
    ).rejects.toThrow(/figure/);
    await expect(checkDisplays(clientServing(PNG_SIGNATURE), [], [figure])).rejects.toThrow(
      /figure/,
    );
  });

  it("rejects figure bytes that are not a PNG", async () => {
    await expect(
      checkDisplays(clientServing([1, 2, 3]), [figure], [{ width: 400, height: 300, title: "T" }]),
    ).rejects.toThrow(/PNG/);
  });
});
