import { describe, expect, it } from "vitest";
import * as ui from "./index.ts";

const COMPONENTS = [
  "Icon",
  "Button",
  "Badge",
  "TrustBadge",
  "StatusIndicator",
  "EngineBadge",
  "Port",
  "TypeGlyph",
  "Node",
  "Edge",
  "Field",
  "Input",
  "Select",
  "Switch",
  "ColumnSelect",
  "ColumnTypeIcon",
  "ConditionBuilder",
  "DataGrid",
  "ColumnProfile",
  "HubCard",
  "Notice",
] as const;

describe("@nodomics/ui", () => {
  it.each(COMPONENTS)("exports the %s component", (name) => {
    expect(typeof ui[name]).toBe("function");
  });

  it("exports the icon names so callers can pick one", () => {
    expect(Object.keys(ui.ICONS)).toContain("database");
  });

  it("exports the number format so screens count rows like the components do", () => {
    expect(ui.formatNumber(1200)).toBe("1.200");
  });
});
