import { nodePorts } from "@nodomics/protocol";
import type { FlowNode, NodeManifest, PortSpec } from "@nodomics/protocol";
import { dataTypeLabel, TypeGlyph } from "@nodomics/ui";
import { useCatalog, useFlowState } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";

const NAME_SEPARATOR = ", ";

/** The node's inputs and outputs, and for each input the node that feeds it. */
export function PortList({
  node,
  manifest,
}: {
  readonly node: FlowNode;
  readonly manifest: NodeManifest;
}) {
  const feeders = useFeeders(node.id);
  const ports = [
    ...nodePorts(manifest, node.params).inputs.map((port) => ({
      port,
      direction: MESSAGES.params.input,
      from: feeders(port.id),
    })),
    ...nodePorts(manifest, node.params).outputs.map((port) => ({
      port,
      direction: MESSAGES.params.output,
      from: "",
    })),
  ];
  if (ports.length === 0) return null;
  return (
    <div className="web-params-ports">
      <span className="web-label" id={`${node.id}-ports`}>
        {MESSAGES.params.ports}
      </span>
      <ul className="web-port-list" aria-labelledby={`${node.id}-ports`}>
        {ports.map(({ port, direction, from }) => (
          <PortRow key={`${direction}-${port.id}`} port={port} direction={direction} from={from} />
        ))}
      </ul>
    </div>
  );
}

function PortRow({
  port,
  direction,
  from,
}: {
  readonly port: PortSpec;
  readonly direction: string;
  readonly from: string;
}) {
  return (
    <li>
      <TypeGlyph type={port.type} size="var(--space-3)" />
      <span className="web-mono">{port.id}</span>
      <span className="web-caption">{`${direction} · ${dataTypeLabel(port.type)}`}</span>
      {from !== "" && <span className="web-caption web-port-from">{from}</span>}
    </li>
  );
}

/** Names the nodes connected to an input port of `nodeId`. */
function useFeeders(nodeId: string) {
  const flow = useFlowState((state) => state.flow);
  const catalog = useCatalog();
  const titleOf = (id: string) => {
    const node = flow.nodes.find((candidate) => candidate.id === id);
    return node?.label ?? catalog.find((manifest) => manifest.id === node?.type)?.name ?? id;
  };
  return (portId: string) =>
    flow.edges
      .filter((edge) => edge.to.node === nodeId && edge.to.port === portId)
      .map((edge) => titleOf(edge.from.node))
      .join(NAME_SEPARATOR);
}
