import { describe, expect, it } from "vitest";
import { exportJsonSchemas } from "./json-schema.ts";

describe("exportJsonSchemas", () => {
  it("produces plain JSON that other languages can load", () => {
    const exported = exportJsonSchemas();

    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });

  it("includes every NEP method and the executor protocol", () => {
    const exported = exportJsonSchemas();

    expect(Object.keys(exported.nep.requests)).toContain("flow.set");
    expect(Object.keys(exported.executor.requests)).toContain("exec.run");
    expect(exported.flow).toHaveProperty("properties.nodes");
  });
});
