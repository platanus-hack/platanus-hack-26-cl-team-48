import type { FlowNode, NodeManifest } from "@nodomics/protocol";
import { isResourceManifest, resourceState } from "../canvas/resource-nodes.ts";
import { useId, useRef } from "react";
import { Button, ICON_SIZE, Icon, StatusIndicator } from "@nodomics/ui";
import { NODE_ACTION_MESSAGES } from "../canvas/node-action-messages.ts";
import { useRunFlow } from "../engine/use-engine-actions.ts";
import { toUiExecState } from "../engine/ui-types.ts";
import {
  useCatalog,
  useDispatch,
  useEngineState,
  useFlowState,
  useSelectedIds,
} from "../app-context.ts";
import { iconOf } from "../canvas/node-views.ts";
import { nodeParamEdit } from "../flow/node-param-edit.ts";
import { ParamsForm } from "../form/ParamsForm.tsx";
import { LAYOUT_MESSAGES } from "../layout/messages.ts";
import { PanelToggle } from "../layout/PanelToggle.tsx";
import { ResizeHandle } from "../layout/ResizeHandle.tsx";
import { PARAMS_WIDTH_RANGE } from "../layout/size-range.ts";
import { UpdateNode } from "./UpdateNode.tsx";
import { PortList } from "./PortList.tsx";
import { NodeDetailTabs, type NodeDetailTab } from "./NodeDetailTabs.tsx";
import { DeployPanel } from "../deploy/DeployPanel.tsx";
import { useOptionalHubProfile } from "../hub/hub-context.ts";
import { MESSAGES } from "../messages.ts";

type ParamsPanelProps = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  /** In multiples of `--panel-min`; the workspace applies it so the canvas makes room. */
  readonly width: number;
  readonly onResize: (width: number) => void;
};

export function ParamsPanel({ isOpen, onToggle, width, onResize }: ParamsPanelProps) {
  const panelId = useId();
  const panel = useRef<HTMLElement>(null);
  const toggle = (
    <PanelToggle
      isOpen={isOpen}
      onToggle={onToggle}
      labels={{ hide: LAYOUT_MESSAGES.hideParams, show: LAYOUT_MESSAGES.showParams }}
      icons={{ hide: "panel-right-close", show: "panel-right-open" }}
    />
  );
  return (
    <aside
      ref={panel}
      id={panelId}
      className="web-params"
      data-open={isOpen}
      data-canvas-inset="right"
      aria-label={MESSAGES.params.title}
    >
      {isOpen ? (
        <>
          <ResizeHandle
            edge="left"
            label={LAYOUT_MESSAGES.resizeParams}
            controls={panelId}
            range={PARAMS_WIDTH_RANGE}
            value={width}
            valueText={LAYOUT_MESSAGES.percent(width * 100)}
            unitsPerPixel={() => widthPerPixel(panel.current, width)}
            onResize={onResize}
            className="web-resize-handle"
          />
          <header className="web-params-header">
            <h2 className="web-params-title">{MESSAGES.params.title}</h2>
            {toggle}
          </header>
          <SelectedNodeParams />
        </>
      ) : (
        <div className="web-params-closed">{toggle}</div>
      )}
    </aside>
  );
}

function SelectedNodeParams() {
  const selectedIds = useSelectedIds();
  const nodes = useFlowState((state) => state.flow.nodes);
  // The selection may still name nodes of the flow that was open before.
  const selected = nodes.filter((candidate) => selectedIds.includes(candidate.id));
  const node = selected.length === 1 ? selected[0] : undefined;
  return (
    <div className="web-params-body">
      {node === undefined ? (
        <p className="web-panel-hint">{MESSAGES.params.empty}</p>
      ) : (
        <NodeParams node={node} />
      )}
    </div>
  );
}

function NodeParams({ node }: { readonly node: FlowNode }) {
  const manifest = useCatalog().find((candidate) => candidate.id === node.type);
  const issues = useEngineState((state) => state.issues);
  const runError = useEngineState((state) => state.nodes[node.id]?.error);
  const dispatch = useDispatch();
  const flow = useFlowState((state) => state.flow);
  const isSignedIn = useOptionalHubProfile() !== undefined;
  if (manifest === undefined)
    return <p className="web-panel-hint">{MESSAGES.params.unknownNode}</p>;
  return (
    <>
      <div className="web-params-node">
        <div className="web-params-node-name">
          <span className="web-node-icon">
            <Icon name={iconOf(manifest)} size={ICON_SIZE.sm} />
          </span>
          <h3>{node.label ?? manifest.name}</h3>
        </div>
        <NodeRunHeader nodeId={node.id} isResource={isResourceManifest(manifest)} />
        {manifest.description !== undefined && (
          <p className="web-params-description">{manifest.description}</p>
        )}
      </div>
      <NodeDetailTabs tabs={detailTabsOf(manifest, isSignedIn)}>
        {(tab) => {
          if (tab === "deploy") return <DeployPanel key={node.id} nodeId={node.id} />;
          if (tab === "ports") return <PortList node={node} manifest={manifest} />;
          if (tab === "history")
            return <p className="web-mockup-note">{MESSAGES.params.historyMockup}</p>;
          return (
            <>
              <UpdateNode node={node} />
              <ParamsForm
                node={node}
                manifest={manifest}
                issues={[
                  ...issues.filter((issue) => issue.nodeId === node.id),
                  ...(runError?.param === undefined ? [] : [{ ...runError, nodeId: node.id }]),
                ]}
                onChange={(param, value) => {
                  dispatch(nodeParamEdit({ flow, node, manifest, param, value }));
                }}
              />
            </>
          );
        }}
      </NodeDetailTabs>
    </>
  );
}

const BASE_TABS: readonly NodeDetailTab[] = ["params", "ports", "history"];

/** A service node can be deployed from its own tab, by a signed-in user (ADR 0027 §5). */
const detailTabsOf = (manifest: NodeManifest, isSignedIn: boolean): readonly NodeDetailTab[] =>
  isSignedIn && isService(manifest) ? [...BASE_TABS, "deploy"] : BASE_TABS;

const isService = ({ impl }: NodeManifest) =>
  impl.kind === "resource" && impl.resource === "service";

/** The node's last run and a way to run just it, as on its card in the canvas. */
function NodeRunHeader({
  nodeId,
  isResource,
}: {
  readonly nodeId: string;
  readonly isResource: boolean;
}) {
  const state = useEngineState((engine) => engine.nodes[nodeId]?.state);
  const run = useRunFlow();
  if (isResource)
    return (
      <div className="web-params-node-run">
        <StatusIndicator state={toUiExecState(resourceState(state))} />
      </div>
    );
  return (
    <div className="web-params-node-run">
      <StatusIndicator state={toUiExecState(state)} />
      <Button
        size="sm"
        icon="play"
        disabled={run === undefined}
        onClick={() => void run?.([nodeId])}
      >
        {NODE_ACTION_MESSAGES.run}
      </Button>
    </div>
  );
}

const widthPerPixel = (panel: HTMLElement | null, width: number) => {
  const pixels = panel?.getBoundingClientRect().width ?? 0;
  return pixels > 0 ? width / pixels : 0;
};
