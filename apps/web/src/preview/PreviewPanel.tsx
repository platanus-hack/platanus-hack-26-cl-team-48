import type { DisplayRef, ResultRef } from "@nodomics/protocol";
import { isResourceManifest } from "../canvas/resource-nodes.ts";
import { formatNumber } from "@nodomics/ui";
import { useState, type ReactNode } from "react";
import { useCatalog, useEngineState, useFlowState, useSelectedIds } from "../app-context.ts";
import { selectViewVersion } from "../engine/engine-state.ts";
import { MESSAGES } from "../messages.ts";
import { ChartPreview } from "./ChartPreview.tsx";
import { DataPreview } from "./DataPreview.tsx";
import { FigureList } from "./FigureImage.tsx";
import { PreviewTabs, type PreviewTab } from "./PreviewTabs.tsx";
import { ProfileTable } from "./ProfileTable.tsx";

export function PreviewPanel({ actions }: { readonly actions?: ReactNode }) {
  const selectedIds = useSelectedIds();
  const nodeId = selectedIds.length === 1 ? selectedIds[0] : undefined;
  return (
    <section className="web-preview" aria-label={MESSAGES.preview.title}>
      {nodeId === undefined ? (
        <>
          <PreviewHeader actions={actions} />
          <p className="web-panel-hint web-preview-hint">{MESSAGES.preview.empty}</p>
        </>
      ) : (
        <NodePreview key={nodeId} nodeId={nodeId} actions={actions} />
      )}
    </section>
  );
}

function NodePreview({
  nodeId,
  actions,
}: {
  readonly nodeId: string;
  readonly actions?: ReactNode;
}) {
  const node = useFlowState((state) =>
    state.flow.nodes.find((candidate) => candidate.id === nodeId),
  );
  const manifest = useCatalog().find((candidate) => candidate.id === node?.type);
  const resultRef = useEngineState((state) => Object.values(state.results[nodeId] ?? {}).at(0));
  const runVersion = useEngineState((state) => selectViewVersion(state, nodeId));
  const displays = useEngineState((state) => state.displays[nodeId]);
  const tabs = availableTabs({
    hasResult: resultRef !== undefined,
    hasChart: manifest?.impl.kind === "view" || (displays?.length ?? 0) > 0,
  });
  const [chosen, setChosen] = useState<PreviewTab | undefined>(undefined);
  const [tools, setTools] = useState<HTMLElement | null>(null);
  const tab = chosen !== undefined && tabs.includes(chosen) ? chosen : tabs.at(0);
  const subject = { name: node?.label ?? manifest?.name, resultRef };
  if (tab === undefined)
    return (
      <>
        <PreviewHeader actions={actions} subject={subject} />
        <p className="web-panel-hint web-preview-hint">
          {isResourceManifest(manifest) ? MESSAGES.preview.resource : MESSAGES.preview.noResult}
        </p>
      </>
    );
  return (
    <PreviewTabs
      tabs={tabs}
      selected={tab}
      onSelect={setChosen}
      header={(tabList) => (
        <PreviewHeader actions={actions} subject={subject}>
          {tabList}
          <div ref={setTools} className="web-preview-tools" />
        </PreviewHeader>
      )}
    >
      <TabContent
        tab={tab}
        nodeId={nodeId}
        resultRef={resultRef}
        displays={displays}
        runVersion={runVersion}
        tools={tools}
      />
    </PreviewTabs>
  );
}

type TabContentProps = {
  readonly tab: PreviewTab;
  readonly nodeId: string;
  readonly resultRef: ResultRef | undefined;
  readonly displays: ReadonlyArray<DisplayRef> | undefined;
  readonly runVersion: string | undefined;
  readonly tools: HTMLElement | null;
};

function TabContent({ tab, nodeId, resultRef, displays, runVersion, tools }: TabContentProps) {
  if (tab === "chart")
    return displays !== undefined && displays.length > 0 ? (
      <FigureList displays={displays} />
    ) : (
      <ChartPreview nodeId={nodeId} version={runVersion} />
    );
  if (resultRef === undefined) return null;
  return tab === "data" ? (
    <DataPreview key={resultRef.id} resultRef={resultRef} controlsTarget={tools} />
  ) : (
    <ProfileTable resultRef={resultRef} />
  );
}

function availableTabs(node: { readonly hasResult: boolean; readonly hasChart: boolean }) {
  return [
    ...(node.hasChart ? (["chart"] as const) : []),
    ...(node.hasResult ? (["data", "profile"] as const) : []),
  ];
}

type PreviewSubject = {
  readonly name: string | undefined;
  readonly resultRef: ResultRef | undefined;
};

function PreviewHeader({
  actions,
  subject,
  children,
}: {
  readonly actions?: ReactNode;
  readonly subject?: PreviewSubject;
  readonly children?: ReactNode;
}) {
  return (
    <header className="web-preview-header">
      <h2 className="web-overline">{MESSAGES.preview.title}</h2>
      {subject?.name !== undefined && (
        <>
          <span className="web-divider" aria-hidden="true" />
          <span className="web-preview-subject">{subject.name}</span>
        </>
      )}
      {subject?.resultRef !== undefined && (
        <span className="web-mono web-muted">
          {MESSAGES.preview.dimensions(
            formatNumber(subject.resultRef.rowCount),
            formatNumber(subject.resultRef.schema.length),
          )}
        </span>
      )}
      <span className="web-spacer" />
      {children}
      {actions}
    </header>
  );
}
