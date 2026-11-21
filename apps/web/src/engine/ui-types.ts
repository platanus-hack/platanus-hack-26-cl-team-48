import type { Capabilities, ColumnType, NodeState } from "@nodomics/protocol";
import type { ColumnType as UiColumnType, Engine, ExecState } from "@nodomics/ui";

const UI_ENGINES: Record<Capabilities["engine"], Engine> = {
  browser: "browser",
  local: "local",
  cloud: "cloud",
  // The simulated engine runs in a Web Worker of the browser.
  mock: "browser",
};

const UI_COLUMN_TYPES: Record<ColumnType, UiColumnType> = {
  number: "number",
  text: "text",
  date: "date",
  bool: "bool",
  geo: "geo",
  other: "text",
};

/** A node without news from the engine has not run yet. */
export const toUiExecState = (state: NodeState | undefined): ExecState => state ?? "idle";

export const toUiEngine = (engine: Capabilities["engine"]): Engine => UI_ENGINES[engine];

export const toUiColumnType = (type: ColumnType): UiColumnType => UI_COLUMN_TYPES[type];
