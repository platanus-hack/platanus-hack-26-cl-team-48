import { describe, expect, it } from "vitest";
import { contentHashOf } from "../src/feed/content-hash.ts";

const TEXTS = { offers: "offers text", seeks: "seeks text" };

describe("contentHashOf", () => {
  it("is deterministic for the same input", () => {
    const first = contentHashOf({ model: "voyage-4", texts: TEXTS });

    const second = contentHashOf({ model: "voyage-4", texts: { ...TEXTS } });

    expect(second).toBe(first);
  });

  it("changes when the model changes", () => {
    const first = contentHashOf({ model: "voyage-4", texts: TEXTS });

    const second = contentHashOf({ model: "voyage-5", texts: TEXTS });

    expect(second).not.toBe(first);
  });

  it("changes when the offers text changes", () => {
    const first = contentHashOf({ model: "voyage-4", texts: TEXTS });

    const second = contentHashOf({ model: "voyage-4", texts: { ...TEXTS, offers: "other" } });

    expect(second).not.toBe(first);
  });

  it("changes when the seeks text changes", () => {
    const first = contentHashOf({ model: "voyage-4", texts: TEXTS });

    const second = contentHashOf({ model: "voyage-4", texts: { ...TEXTS, seeks: "other" } });

    expect(second).not.toBe(first);
  });

  it("changes when the seeks text disappears", () => {
    const first = contentHashOf({ model: "voyage-4", texts: TEXTS });

    const second = contentHashOf({ model: "voyage-4", texts: { ...TEXTS, seeks: undefined } });

    expect(second).not.toBe(first);
  });

  it("does not collide when text moves between offers and seeks", () => {
    const first = contentHashOf({ model: "m", texts: { offers: "ab", seeks: "c" } });

    const second = contentHashOf({ model: "m", texts: { offers: "a", seeks: "bc" } });

    expect(second).not.toBe(first);
  });
});
