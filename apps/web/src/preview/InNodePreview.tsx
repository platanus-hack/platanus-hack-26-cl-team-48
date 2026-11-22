import type { DisplayRef, ResultRef } from "@nodomics/protocol";
import { DataGrid, formatNumber, ICON_SIZE, Icon } from "@nodomics/ui";
import { useState, type ReactNode } from "react";
import { useCatalog, useEngineState, useFlowState } from "../app-context.ts";
import { selectViewVersion } from "../engine/engine-state.ts";
import { useEngineQuery } from "../engine/use-engine-query.ts";
import { usePreviewLocation } from "../layout/preview-location.ts";
import { Segmented } from "../layout/Segmented.tsx";
import { MESSAGES } from "../messages.ts";
import { isResourceManifest } from "../canvas/resource-nodes.ts";
import { ChartPreview } from "./ChartPreview.tsx";
import { FigureImage } from "./FigureImage.tsx";
import { toGridColumns } from "./preview-model.ts";
import { ProfileTable } from "./ProfileTable.tsx";
import { QueryStatus } from "./QueryStatus.tsx";

/** Rows a node shows of its own result; the panel pages through the rest. */
export const IN_NODE_ROWS = 6;

type Content = "data" | "profile";

/** The preview drawn inside a node: its chart, the first figure its code showed, or its table. */
export function InNodePreview({ nodeId }: { readonly nodeId: string }) {
  const type = useFlowState((state) => state.flow.nodes.find((node) => node.id === nodeId)?.type);
  const manifest = useCatalog().find((candidate) => candidate.id === type);
  const isView = manifest?.impl.kind === "view";
  const resultRef = useEngineState((state) => Object.values(state.results[nodeId] ?? {}).at(0));
  const viewVersion = useEngineState((state) => selectViewVersion(state, nodeId));
  const displays = useEngineState((state) => state.displays[nodeId]);
  if (isView && viewVersion !== undefined)
    return <InNodeChart nodeId={nodeId} version={viewVersion} />;
  if (displays !== undefined && displays.length > 0)
    return <InNodeFigure nodeId={nodeId} displays={displays} />;
  if (resultRef === undefined)
    return (
      <p className="web-in-node-hint">
        {isResourceManifest(manifest) ? MESSAGES.preview.resource : MESSAGES.preview.noResult}
      </p>
    );
  return <InNodeTable nodeId={nodeId} resultRef={resultRef} />;
}

function InNodeChart({ nodeId, version }: { readonly nodeId: string; readonly version: string }) {
  return (
    <div className="web-in-node nodrag nowheel">
      <div className="web-in-node-chart">
        <ChartPreview nodeId={nodeId} version={version} canExport={false} />
      </div>
      <InNodeFooter nodeId={nodeId} label={MESSAGES.preview.openChart} />
    </div>
  );
}

function InNodeFigure({
  nodeId,
  displays,
}: {
  readonly nodeId: string;
  readonly displays: ReadonlyArray<DisplayRef>;
}) {
  const [first] = displays;
  return (
    <div className="web-in-node nodrag nowheel">
      <div className="web-in-node-figure">
        {first !== undefined && <FigureImage display={first} index={0} />}
      </div>
      <InNodeFooter
        nodeId={nodeId}
        label={MESSAGES.preview.openChart}
        note={
          displays.length > 1
            ? MESSAGES.preview.shownFigures(formatNumber(1), formatNumber(displays.length))
            : undefined
        }
      />
    </div>
  );
}

function InNodeTable({
  nodeId,
  resultRef,
}: {
  readonly nodeId: string;
  readonly resultRef: ResultRef;
}) {
  const [content, setContent] = useState<Content>("data");
  return (
    <div className="web-in-node nodrag nowheel">
      <div className="web-in-node-head">
        <Segmented
          size="sm"
          label={MESSAGES.preview.content}
          value={content}
          onChange={setContent}
          options={[
            { value: "data", label: MESSAGES.preview.tabs.data },
            { value: "profile", label: MESSAGES.preview.tabs.profile },
          ]}
        />
        <span className="web-mono web-muted">{describeSize(resultRef)}</span>
      </div>
      {content === "data" ? (
        <DataSample nodeId={nodeId} resultRef={resultRef} />
      ) : (
        <>
          <div className="web-in-node-table">
            <ProfileTable resultRef={resultRef} />
          </div>
          <InNodeFooter
            nodeId={nodeId}
            label={MESSAGES.preview.openTable}
            note={MESSAGES.preview.profiledRows(formatNumber(resultRef.rowCount))}
          />
        </>
      )}
    </div>
  );
}

function DataSample({
  nodeId,
  resultRef,
}: {
  readonly nodeId: string;
  readonly resultRef: ResultRef;
}) {
  const page = useEngineQuery(`sample:${resultRef.id}`, (session) =>
    session.page(resultRef.id, { offset: 0, limit: IN_NODE_ROWS }),
  );
  if (page.status !== "ready")
    return (
      <>
        <QueryStatus state={page} />
        <InNodeFooter nodeId={nodeId} label={MESSAGES.preview.openTable} />
      </>
    );
  return (
    <>
      <div className="web-in-node-table">
        <DataGrid
          variant="inline"
          density="compact"
          columns={toGridColumns(page.value.columns, undefined)}
          rows={page.value.rows}
        />
      </div>
      <InNodeFooter
        nodeId={nodeId}
        label={MESSAGES.preview.openTable}
        note={MESSAGES.preview.shownRows(
          formatNumber(page.value.rows.length),
          formatNumber(page.value.total),
        )}
      />
    </>
  );
}

function InNodeFooter({
  nodeId,
  label,
  note,
}: {
  readonly nodeId: string;
  readonly label: string;
  readonly note?: ReactNode;
}) {
  const { openInPanel } = usePreviewLocation();
  return (
    <div className="web-in-node-footer">
      <span className="web-caption">{note}</span>
      <button
        type="button"
        className="nd-btn nd-btn-ghost nd-btn-sm web-link"
        onClick={() => {
          openInPanel(nodeId);
        }}
      >
        <Icon name="maximize-2" size={ICON_SIZE.sm} />
        {label}
      </button>
    </div>
  );
}

const describeSize = (resultRef: ResultRef) =>
  MESSAGES.preview.dimensions(
    formatNumber(resultRef.rowCount),
    formatNumber(resultRef.schema.length),
  );
