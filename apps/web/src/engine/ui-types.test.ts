import { describe, expect, it } from "vitest";
import { toUiColumnType, toUiEngine, toUiExecState } from "./ui-types.ts";

describe("toUiExecState", () => {
  it("shows a node the engine has not reported on as idle", () => {
    expect(toUiExecState(undefined)).toBe("idle");
  });

  it("keeps every state the protocol defines", () => {
    expect(toUiExecState("cached")).toBe("cached");
    expect(toUiExecState("error")).toBe("error");
  });
});

describe("toUiEngine", () => {
  it("shows the simulated engine as running in the browser, where its worker lives", () => {
    expect(toUiEngine("mock")).toBe("browser");
  });

  it("keeps the engines the design system knows", () => {
    expect(toUiEngine("local")).toBe("local");
    expect(toUiEngine("cloud")).toBe("cloud");
  });
});

describe("toUiColumnType", () => {
  it("shows columns of an unknown type as text", () => {
    expect(toUiColumnType("other")).toBe("text");
  });

  it("keeps the column types the design system knows", () => {
    expect(toUiColumnType("date")).toBe("date");
  });
});
