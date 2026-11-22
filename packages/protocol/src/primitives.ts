import { Type, type Static } from "@sinclair/typebox";

export const Id = Type.String({ pattern: "^[A-Za-z0-9_.-]{1,64}$" });

export const SemVer = Type.String({ pattern: "^\\d+\\.\\d+\\.\\d+(-[0-9A-Za-z.-]+)?$" });

export const Revision = Type.Integer({ minimum: 0 });

export const DataType = Type.Union([
  Type.Literal("table"),
  Type.Literal("column"),
  Type.Literal("value"),
  Type.Literal("geo"),
  Type.Literal("image"),
  Type.Literal("model"),
  Type.Literal("chart"),
  Type.Literal("repo"),
  Type.Literal("service"),
  Type.Literal("any"),
]);
export type DataType = Static<typeof DataType>;

export const ColumnType = Type.Union([
  Type.Literal("number"),
  Type.Literal("text"),
  Type.Literal("date"),
  Type.Literal("bool"),
  Type.Literal("geo"),
  Type.Literal("other"),
]);
export type ColumnType = Static<typeof ColumnType>;

export const Column = Type.Object({ name: Type.String(), type: ColumnType });
export type Column = Static<typeof Column>;

export const Runtime = Type.Union([Type.Literal("sql"), Type.Literal("python")]);
export type Runtime = Static<typeof Runtime>;

export const ResultRef = Type.Object(
  { id: Type.String(), rowCount: Type.Integer({ minimum: 0 }), schema: Type.Array(Column) },
  { additionalProperties: false },
);
export type ResultRef = Static<typeof ResultRef>;

/**
 * A figure a node showed (`plt.show()` in Python): displayed, never wired to another node. The
 * engine keeps its bytes; `title` comes from the figure and is the image's alternative text.
 */
export const DisplayRef = Type.Object(
  {
    id: Type.String(),
    mime: Type.Literal("image/png"),
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    title: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type DisplayRef = Static<typeof DisplayRef>;

export const DisplayContent = Type.Object({
  mime: Type.Literal("image/png"),
  bytes: Type.Uint8Array(),
});
export type DisplayContent = Static<typeof DisplayContent>;

/** Where completion is asked for: `line` counts from 1 and `column` from 0, as in Jedi. */
export const CodePosition = {
  code: Type.String(),
  line: Type.Integer({ minimum: 1 }),
  column: Type.Integer({ minimum: 0 }),
};

export const CompletionKind = Type.Union([
  Type.Literal("module"),
  Type.Literal("class"),
  Type.Literal("function"),
  Type.Literal("variable"),
  Type.Literal("property"),
  Type.Literal("keyword"),
  Type.Literal("other"),
]);
export type CompletionKind = Static<typeof CompletionKind>;

export const CodeCompletions = Type.Object({
  items: Type.Array(
    Type.Object({
      label: Type.String(),
      kind: CompletionKind,
      detail: Type.Optional(Type.String()),
      documentation: Type.Optional(Type.String()),
    }),
  ),
});
export type CodeCompletions = Static<typeof CodeCompletions>;
export type CompletionItem = CodeCompletions["items"][number];

export const SortSpec = Type.Object({
  column: Type.String(),
  direction: Type.Union([Type.Literal("asc"), Type.Literal("desc")]),
});
export type SortSpec = Static<typeof SortSpec>;

export const PageWindow = {
  offset: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 1000 }),
  sort: Type.Optional(SortSpec),
};

export const DataPage = Type.Object({
  columns: Type.Array(Column),
  rows: Type.Array(Type.Array(Type.Unknown())),
  total: Type.Integer({ minimum: 0 }),
});
export type DataPage = Static<typeof DataPage>;

export const ColumnProfile = Type.Object({
  name: Type.String(),
  type: ColumnType,
  count: Type.Integer({ minimum: 0 }),
  nulls: Type.Integer({ minimum: 0 }),
  distinct: Type.Integer({ minimum: 0 }),
  min: Type.Optional(Type.String()),
  max: Type.Optional(Type.String()),
  mean: Type.Optional(Type.Number()),
  bins: Type.Array(Type.Number()),
});
export type ColumnProfile = Static<typeof ColumnProfile>;

export const DataProfile = Type.Object({ columns: Type.Array(ColumnProfile) });
export type DataProfile = Static<typeof DataProfile>;

export const Empty = Type.Object({});

export const SourceFormat = Type.Union([
  Type.Literal("csv"),
  Type.Literal("parquet"),
  Type.Literal("json"),
  Type.Literal("txt"),
]);
export type SourceFormat = Static<typeof SourceFormat>;
