import {
  Column,
  DataPage,
  DataProfile,
  DisplayRef,
  NodeError,
  NodeManifest,
  NodeState,
  parse,
  ResultRef,
  type DisplayContent,
  type Result,
  type ValidationIssue,
} from "@nodomics/protocol";
import { Type, type Static } from "@sinclair/typebox";

export const SNAPSHOT_FORMAT = "nodomics/snapshot@0";

/** The answer to `data.view`, as the engine gave it. */
const ViewData = Type.Object({
  spec: Type.Unknown(),
  rowCount: Type.Integer({ minimum: 0 }),
  sampled: Type.Boolean(),
});

/** A figure's bytes as base64, so the snapshot stays plain JSON. */
const StoredFigure = Type.Object({ mime: Type.Literal("image/png"), base64: Type.String() });
export type StoredFigure = Static<typeof StoredFigure>;

const ByNode = <T extends Parameters<typeof Type.Record>[1]>(value: T) =>
  Type.Record(Type.String(), value);

/**
 * What the engine answered while its author looked at the flow (ADR 0018), replayed without an
 * engine. `state` is absent when the flow was published without it.
 */
export const Snapshot = Type.Object({
  format: Type.Literal(SNAPSHOT_FORMAT),
  catalog: Type.Array(NodeManifest),
  state: Type.Optional(
    Type.Object({
      nodes: ByNode(Type.Object({ state: NodeState, error: Type.Optional(NodeError) })),
      results: ByNode(ByNode(ResultRef)),
      displays: ByNode(Type.Array(DisplayRef)),
      schemas: ByNode(ByNode(Type.Array(Column))),
      pages: ByNode(DataPage),
      profiles: ByNode(DataProfile),
      views: ByNode(ViewData),
      figures: ByNode(StoredFigure),
    }),
  ),
});
export type Snapshot = Static<typeof Snapshot>;
export type SnapshotState = NonNullable<Snapshot["state"]>;

export const parseSnapshot = (value: unknown): Result<Snapshot, ValidationIssue[]> =>
  parse(Snapshot, value);

// String.fromCharCode takes its arguments on the stack, so large figures go in chunks.
const BASE64_CHUNK = 0x8000;

export function encodeFigure({ mime, bytes }: DisplayContent): StoredFigure {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK)
    chunks.push(String.fromCharCode(...bytes.subarray(start, start + BASE64_CHUNK)));
  return { mime, base64: btoa(chunks.join("")) };
}

export const decodeFigure = ({ mime, base64 }: StoredFigure): DisplayContent => ({
  mime,
  bytes: Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
});
