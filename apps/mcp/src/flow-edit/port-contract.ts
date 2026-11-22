import type { DataType, Flow, FlowEdge, PortSpec } from "@nodomics/protocol";

const ANY_DATA: DataType = "any";

/** Ports connect when they carry the same data, or when either side accepts any data. */
export const areTypesCompatible = (output: DataType, input: DataType): boolean =>
  output === input || output === ANY_DATA || input === ANY_DATA;

export function typeMismatch(from: PortSpec, to: PortSpec, target: string): string | undefined {
  return areTypesCompatible(from.type, to.type)
    ? undefined
    : `Incompatible ports ${target}: ${from.type} cannot feed ${to.type}`;
}

/** An input that is not multi keeps only its newest connection. */
export const withoutPreviousInput = (flow: Flow, to: FlowEdge["to"], input: PortSpec): Flow =>
  input.multi === true
    ? flow
    : {
        ...flow,
        edges: flow.edges.filter((edge) => edge.to.node !== to.node || edge.to.port !== to.port),
      };

export function crowdedInputs(flow: Flow, isMulti: (edge: FlowEdge) => boolean): FlowEdge[] {
  return flow.edges.filter(
    (edge, index) =>
      !isMulti(edge) &&
      flow.edges.findIndex(
        (other) => other.to.node === edge.to.node && other.to.port === edge.to.port,
      ) !== index,
  );
}

export const crowdedMessage = (edge: FlowEdge): string =>
  `Input ${edge.to.node}.${edge.to.port} accepts only one connection`;
