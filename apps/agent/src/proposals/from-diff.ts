import type { DiffEntry } from "../mcp/fake-diff.ts";

export type UnreasonedChange = DiffEntry["change"] & {
  readonly reason: "";
  readonly needsReason: true;
  readonly dependsOn: readonly string[];
};

function relatedNodeIds(entry: DiffEntry): string[] {
  if (entry.change.kind === "set_param") return [entry.change.target.split(".")[0] ?? ""];
  if (entry.change.kind !== "connect") return [];
  return entry.change.target.split("->").map((ref) => ref.split(".")[0] ?? "");
}

export function toProposalChanges(entries: readonly DiffEntry[]): UnreasonedChange[] {
  const additions = new Map(
    entries
      .filter((entry) => entry.change.kind === "add_node")
      .map((entry) => [entry.change.target, entry.change.id]),
  );
  return entries.map((entry) => ({
    ...entry.change,
    reason: "",
    needsReason: true,
    dependsOn: relatedNodeIds(entry).flatMap((id) => {
      const dependency = additions.get(id);
      return dependency === undefined ? [] : [dependency];
    }),
  }));
}
