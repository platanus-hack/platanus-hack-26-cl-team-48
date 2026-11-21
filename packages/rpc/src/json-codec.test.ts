import { describe, expect, it } from "vitest";
import { decodeJson, encodeJson } from "./json-codec.ts";

describe("json codec", () => {
  it("round-trips binary fields through text", () => {
    const message = { result: { arrow: new Uint8Array([0, 1, 254, 255]) }, nested: [{ n: 1 }] };

    expect(decodeJson(encodeJson(message))).toEqual(message);
  });

  it("encodes binary data as base64 so non-JS engines can read it", () => {
    expect(JSON.parse(encodeJson({ arrow: new Uint8Array([104, 105]) }))).toEqual({
      arrow: { $bytes: "aGk=" },
    });
  });
});
