export type DataType =
  "table" | "column" | "value" | "geo" | "image" | "model" | "chart" | "repo" | "service" | "any";

export type ColumnType = "number" | "text" | "date" | "bool" | "geo";

export type ExecState =
  "idle" | "queued" | "running" | "done" | "cached" | "stale" | "error" | "cancelled";

export type Condition =
  | "warning"
  | "incomplete"
  | "disabled"
  | "missing"
  | "update"
  | "deprecated"
  | "engine"
  | "credential"
  | "permission";

export type Engine = "browser" | "local" | "cloud";

export type TrustLevel = "official" | "verified" | "org" | "community" | "deprecated";

export type Point = { readonly x: number; readonly y: number };
