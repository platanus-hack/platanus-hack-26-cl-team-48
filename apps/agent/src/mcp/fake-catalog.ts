import { Type } from "@sinclair/typebox";
import type { Catalog } from "./fake-flow.ts";

export const DEFAULT_CATALOG: Catalog = {
  "data.source": {
    type: "data.source",
    title: "Data source",
    inputs: [],
    outputs: ["table"],
    params: { rows: { title: "Rows", schema: Type.Integer({ minimum: 1 }) } },
  },
  "table.filter": {
    type: "table.filter",
    title: "Filter rows",
    inputs: ["table"],
    outputs: ["table"],
    params: { column: { title: "Column", schema: Type.String() } },
  },
  "calc.window": {
    type: "calc.window",
    title: "Time window",
    inputs: ["table"],
    outputs: ["table"],
    params: {
      hours: { title: "Window", unit: "h", schema: Type.Number({ minimum: 0, maximum: 24 }) },
    },
  },
};
