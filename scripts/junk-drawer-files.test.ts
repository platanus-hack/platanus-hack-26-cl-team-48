import { describe, expect, it } from "vitest";
import { findJunkDrawerFiles } from "./junk-drawer-files.ts";

describe("findJunkDrawerFiles", () => {
  it("flags catch-all module names", () => {
    expect(
      findJunkDrawerFiles([
        "packages/coordinator/src/utils.ts",
        "apps/web/src/helpers.tsx",
        "packages/rpc/src/common.ts",
        "packages/client/src/engine-manager.ts",
      ]),
    ).toHaveLength(4);
  });

  it("accepts modules named after their responsibility", () => {
    expect(
      findJunkDrawerFiles(["packages/coordinator/src/cache-keys.ts", "packages/rpc/src/peer.ts"]),
    ).toEqual([]);
  });
});
