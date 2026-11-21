import { describe, expect, it } from "vitest";
import { isNewerVersion, nextPatchVersion } from "./versions.ts";

describe("isNewerVersion", () => {
  it("treats any version as newer than no version", () => {
    const candidate = "0.0.1";

    const newer = isNewerVersion(candidate, undefined);

    expect(newer).toBe(true);
  });

  it("does not treat an equal version as newer", () => {
    const candidate = "1.2.3";

    const newer = isNewerVersion(candidate, "1.2.3");

    expect(newer).toBe(false);
  });

  it("compares patch numbers numerically", () => {
    const candidate = "0.1.10";

    const newer = isNewerVersion(candidate, "0.1.9");

    expect(newer).toBe(true);
  });

  it("does not treat a numerically smaller patch as newer", () => {
    const candidate = "0.1.9";

    const newer = isNewerVersion(candidate, "0.1.10");

    expect(newer).toBe(false);
  });

  it("compares minor numbers numerically", () => {
    const candidate = "0.10.0";

    const newer = isNewerVersion(candidate, "0.9.99");

    expect(newer).toBe(true);
  });

  it("gives the major number priority over minor and patch", () => {
    const pairs: [string, string][] = [
      ["2.0.0", "1.99.99"],
      ["1.99.99", "2.0.0"],
    ];

    const results = pairs.map(([candidate, latest]) => isNewerVersion(candidate, latest));

    expect(results).toEqual([true, false]);
  });

  it("gives the minor number priority over patch", () => {
    const pairs: [string, string][] = [
      ["1.3.0", "1.2.50"],
      ["1.2.50", "1.3.0"],
    ];

    const results = pairs.map(([candidate, latest]) => isNewerVersion(candidate, latest));

    expect(results).toEqual([true, false]);
  });

  it("does not treat an older version as newer", () => {
    const candidate = "0.1.0";

    const newer = isNewerVersion(candidate, "0.2.0");

    expect(newer).toBe(false);
  });

  it("ignores a prerelease suffix when comparing", () => {
    const pairs: [string, string][] = [
      ["1.0.0-beta", "1.0.0"],
      ["1.0.0", "1.0.0-beta"],
      ["1.0.1-rc.1", "1.0.0"],
      ["1.0.0", "1.0.1-rc.1"],
    ];

    const results = pairs.map(([candidate, latest]) => isNewerVersion(candidate, latest));

    expect(results).toEqual([false, false, true, false]);
  });
});

describe("nextPatchVersion", () => {
  it("starts at 0.1.0 when there is no version", () => {
    const latest = undefined;

    const next = nextPatchVersion(latest);

    expect(next).toBe("0.1.0");
  });

  it("increments the patch and keeps major and minor", () => {
    const latest = "1.4.2";

    const next = nextPatchVersion(latest);

    expect(next).toBe("1.4.3");
  });

  it("increments a multi-digit patch numerically", () => {
    const latest = "0.1.9";

    const next = nextPatchVersion(latest);

    expect(next).toBe("0.1.10");
  });

  it("returns a version newer than the latest", () => {
    const latest = "3.0.99";

    const next = nextPatchVersion(latest);

    expect(isNewerVersion(next, latest)).toBe(true);
  });
});
