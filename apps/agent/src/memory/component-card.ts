import {
  err,
  ok,
  parse,
  type DataType,
  type Result,
  type ValidationIssue,
} from "@nodomics/protocol";
import { ComponentCard } from "../contracts/component-card.ts";
import type { Catalog, ParamSpec } from "../mcp/fake-flow.ts";

export type FlowInputPort = {
  readonly name: string;
  readonly type?: DataType;
  readonly unit?: string;
};

export type FlowParamInput = {
  readonly id: string;
  readonly title?: string;
  readonly value: unknown;
  readonly unit?: string;
};

export type FlowLike = {
  readonly id: string;
  readonly kind?: "node" | "flow";
  readonly name?: string;
  readonly summary?: string;
  readonly process?: string;
  readonly assumptions?: readonly string[];
  readonly inputs?: readonly (string | FlowInputPort)[];
  readonly outputs?: readonly (string | FlowInputPort)[];
  readonly params?: readonly FlowParamInput[];
  readonly nodes?: Readonly<
    Record<
      string,
      {
        readonly id: string;
        readonly type: string;
        readonly params: Readonly<Record<string, unknown>>;
      }
    >
  >;
  readonly edges?: readonly { readonly from: string; readonly to: string }[];
  readonly connections?: readonly { readonly from: string; readonly to: string }[];
  readonly asNode?: {
    readonly name: string;
    readonly inputs: readonly string[];
    readonly params: readonly string[];
  } | null;
  readonly lineage?: {
    readonly parent?: string;
    readonly author?: string;
    readonly adapted_by?: string;
    readonly adaptedBy?: string;
  };
  readonly parent?: string;
  readonly author?: string;
  readonly adapted_by?: string;
  readonly adaptedBy?: string;
};

export type ComponentCardContext = {
  readonly domain: string;
  readonly crop: string;
  readonly region: string;
};

export type ComponentCardHistoryItem = {
  readonly at: string;
  readonly by: string;
  readonly change: string;
};

export type ComponentCardInput = {
  readonly flow: FlowLike;
  readonly manifests?: Catalog | Readonly<Record<string, unknown>>;
  readonly history?: readonly ComponentCardHistoryItem[];
  readonly context: ComponentCardContext;
  readonly name?: string;
  readonly summary?: string;
  readonly process?: string;
  readonly assumptions?: readonly string[];
  readonly lineage?: {
    readonly parent?: string;
    readonly author?: string;
    readonly adapted_by?: string;
    readonly adaptedBy?: string;
  };
};

export type CardErrorCode = "INVALID_CARD";

export type CardError = {
  readonly code: CardErrorCode;
  readonly message: string;
  readonly issues?: readonly ValidationIssue[];
};

type ParamCard = {
  readonly id: string;
  readonly title: string;
  readonly value: unknown;
  readonly unit: string;
};

type PortCard = {
  readonly name: string;
  readonly type: DataType;
  readonly unit: string;
};

function normalizePort(port: string | FlowInputPort): PortCard {
  if (typeof port === "string") {
    return { name: port, type: "value", unit: "" };
  }
  return {
    name: port.name,
    type: port.type ?? "value",
    unit: port.unit ?? "",
  };
}

function resolvePorts(ports: readonly (string | FlowInputPort)[] | undefined): PortCard[] {
  return (ports ?? []).map(normalizePort);
}

function resolveInputs(flow: FlowLike): PortCard[] {
  if (flow.inputs) return resolvePorts(flow.inputs);
  if (flow.asNode?.inputs) return resolvePorts(flow.asNode.inputs);
  return [];
}

function resolveOutputs(flow: FlowLike): PortCard[] {
  return resolvePorts(flow.outputs);
}

function extractParamSpec(
  manifests: Catalog | Readonly<Record<string, unknown>> | undefined,
  nodeType: string,
  paramKey: string,
): { readonly title: string; readonly unit: string } {
  const manifest = manifests?.[nodeType] as
    { readonly params?: Record<string, ParamSpec | undefined> } | undefined;
  const spec = manifest?.params?.[paramKey];
  return {
    title: spec?.title ?? paramKey,
    unit: spec?.unit ?? "",
  };
}

function extractNodeParams(
  node: { readonly type: string; readonly params: Readonly<Record<string, unknown>> },
  manifests?: Catalog | Readonly<Record<string, unknown>>,
): ParamCard[] {
  return Object.entries(node.params).map(([key, value]) => {
    const { title, unit } = extractParamSpec(manifests, node.type, key);
    return { id: key, title, value, unit };
  });
}

function resolveParams(
  flow: FlowLike,
  manifests?: Catalog | Readonly<Record<string, unknown>>,
): ParamCard[] {
  if (flow.params) {
    return flow.params.map((p) => ({
      id: p.id,
      title: p.title ?? p.id,
      value: p.value,
      unit: p.unit ?? "",
    }));
  }
  if (!flow.nodes) return [];
  return Object.values(flow.nodes).flatMap((node) => extractNodeParams(node, manifests));
}

function resolveLineage(
  flow: FlowLike,
  input: ComponentCardInput,
  history: readonly ComponentCardHistoryItem[],
): { readonly parent: string; readonly author: string; readonly adapted_by: string } {
  const parent = flow.lineage?.parent ?? flow.parent ?? input.lineage?.parent ?? "";
  const author = flow.lineage?.author ?? flow.author ?? input.lineage?.author ?? "";
  const lastAuthor = history.length > 0 ? (history[history.length - 1]?.by ?? "") : "";
  const adaptedBy =
    flow.lineage?.adapted_by ??
    flow.lineage?.adaptedBy ??
    flow.adapted_by ??
    flow.adaptedBy ??
    input.lineage?.adapted_by ??
    input.lineage?.adaptedBy ??
    lastAuthor;
  return { parent, author, adapted_by: adaptedBy };
}

function resolveConnections(flow: FlowLike): { readonly from: string; readonly to: string }[] {
  if (flow.connections) return [...flow.connections];
  if (flow.edges) return flow.edges.map((e) => ({ from: e.from, to: e.to }));
  return [];
}

function assembleCard(input: ComponentCardInput): unknown {
  const flow = input.flow;
  const history = input.history ?? [];
  return {
    id: flow.id,
    kind: flow.kind ?? "flow",
    name: flow.name ?? input.name ?? flow.asNode?.name ?? flow.id,
    summary: flow.summary ?? input.summary ?? "",
    inputs: resolveInputs(flow),
    outputs: resolveOutputs(flow),
    params: resolveParams(flow, input.manifests),
    process: flow.process ?? input.process ?? "",
    connections: resolveConnections(flow),
    assumptions: flow.assumptions ?? input.assumptions ?? [],
    context: input.context,
    lineage: resolveLineage(flow, input, history),
    history: [...history],
  };
}

export function buildComponentCard(input: ComponentCardInput): Result<ComponentCard, CardError> {
  const parsed = parse(ComponentCard, assembleCard(input));
  if (!parsed.ok) {
    return err({
      code: "INVALID_CARD",
      message: "Invalid component card",
      issues: parsed.error,
    });
  }
  return ok(parsed.value);
}

function formatPort(port: { readonly name: string; readonly unit: string }): string {
  return port.unit.length > 0 ? `${port.name} (${port.unit})` : port.name;
}

function formatParam(param: {
  readonly title: string;
  readonly value: unknown;
  readonly unit: string;
}): string {
  const val =
    typeof param.value === "object" && param.value !== null
      ? JSON.stringify(param.value)
      : String(param.value);
  return param.unit.length > 0 ? `${param.title}: ${val} ${param.unit}` : `${param.title}: ${val}`;
}

export function cardToEmbeddingText(card: ComponentCard): string {
  const inputsText = [...card.inputs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatPort)
    .join(", ");
  const outputsText = [...card.outputs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatPort)
    .join(", ");
  const paramsText = [...card.params]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(formatParam)
    .join(", ");
  const assumptionsText = [...card.assumptions].sort().join(", ");
  const contextText = `${card.context.domain}, ${card.context.crop}, ${card.context.region}`;

  return [
    card.name,
    card.summary,
    card.process,
    inputsText,
    outputsText,
    paramsText,
    assumptionsText,
    contextText,
  ]
    .filter((entry) => entry.length > 0)
    .join("\n");
}
