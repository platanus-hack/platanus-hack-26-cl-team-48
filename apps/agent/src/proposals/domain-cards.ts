import type { NodeManifest } from "@nodomics/protocol";
import type { DomainCard } from "../contracts/domain-card.ts";
import type { ProposalChange } from "../contracts/proposal.ts";

export type ManifestLookup = Readonly<Record<string, NodeManifest>>;

function schemaText(schema: unknown, key: "title" | "x-unit" | "unit"): string | undefined {
  if (typeof schema !== "object" || schema === null) return undefined;
  const value =
    key === "title" && "title" in schema
      ? schema.title
      : key === "unit" && "unit" in schema
        ? schema.unit
        : key === "x-unit" && "x-unit" in schema
          ? schema["x-unit"]
          : undefined;
  return typeof value === "string" ? value : undefined;
}

function cardLabel(
  change: ProposalChange,
  manifests: ManifestLookup,
): {
  readonly title: string;
  readonly unit?: string;
} {
  const [nodeId = "", param = ""] = change.target.split(".");
  const manifest = manifests[nodeId];
  if (change.kind === "set_param") {
    const schema = manifest?.params.properties[param];
    const unit = schemaText(schema, "x-unit") ?? schemaText(schema, "unit");
    return {
      title: schemaText(schema, "title") ?? "Parámetro",
      ...(unit === undefined ? {} : { unit }),
    };
  }
  if (change.kind === "add_node" || change.kind === "remove_node") {
    return { title: manifest?.name ?? "Nodo" };
  }
  return {
    title:
      change.kind === "connect" || change.kind === "disconnect" ? "Conexión" : "Nodo personalizado",
  };
}

export function toDomainCards(
  changes: readonly ProposalChange[],
  manifests: ManifestLookup,
): DomainCard[] {
  return changes.map((change) => ({
    changeId: change.id,
    ...cardLabel(change, manifests),
    ...(change.before !== undefined ? { before: change.before } : {}),
    ...(change.after !== undefined ? { after: change.after } : {}),
    reason: change.reason,
  }));
}
