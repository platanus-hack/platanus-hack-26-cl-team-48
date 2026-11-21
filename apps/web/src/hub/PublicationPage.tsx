import type { PublicationDetail, PublishedVersion } from "@nodomics/hub";
import { SNAPSHOT_FORMAT } from "@nodomics/hub";
import type { Flow, NodeManifest } from "@nodomics/protocol";
import { Badge, Button, Field, Notice, Select } from "@nodomics/ui";
import { useCallback, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { FlowPreview } from "./FlowPreview.tsx";
import { withoutPrivateParams } from "./hub-flow.ts";
import { manifestsToInstall } from "./hub-install.ts";
import { useHub } from "./hub-context.ts";
import { useHubQuery } from "./use-hub-query.ts";

type PublicationPageProps = {
  readonly handle: string;
  readonly slug: string;
  readonly onOpenCopy: (flow: Flow) => void;
  readonly onInstall: (manifests: ReadonlyArray<NodeManifest>) => void;
};
type Actions = Pick<PublicationPageProps, "onOpenCopy" | "onInstall">;

/** One publication with its versions, its preview and how to use it (ADR 0018, `/hub/<handle>/<slug>`). */
export function PublicationPage({ handle, slug, ...actions }: PublicationPageProps) {
  const detail = usePublication(handle, slug);
  if (detail.status === "loading") return <main className="web-hub-page" />;
  return (
    <main className="web-hub-page">
      {detail.status === "failed" && <Notice tone="error" title={MESSAGES.hub.failed} />}
      {detail.status === "ready" &&
        (detail.value === undefined ? (
          <p className="web-hub-empty">{MESSAGES.hub.noPublication}</p>
        ) : (
          <PublicationView key={detail.value.id} detail={detail.value} {...actions} />
        ))}
    </main>
  );
}

function PublicationView({ detail, ...actions }: { readonly detail: PublicationDetail } & Actions) {
  const [selected, select] = useState(detail.versions[0]?.version ?? "");
  const version = usePublishedVersion(detail.id, selected);
  return (
    <>
      <PublicationHeader detail={detail} />
      <div className="web-hub-toolbar">
        <Field label={MESSAGES.hub.version}>
          <Select options={versionOptions(detail)} value={selected} onChange={select} />
        </Field>
        {version.status === "ready" && (
          <VersionActions kind={detail.kind} version={version.value} {...actions} />
        )}
      </div>
      {version.status === "failed" && <Notice tone="error" title={MESSAGES.hub.failed} />}
      {version.status === "ready" && (
        <FlowPreview flow={version.value.flow} snapshot={snapshotOf(version.value)} />
      )}
    </>
  );
}

function PublicationHeader({ detail }: { readonly detail: PublicationDetail }) {
  return (
    <header className="web-hub-publication">
      <h1>{detail.title}</h1>
      <RouteLink route={{ page: "profile", handle: detail.owner.handle }}>
        {`@${detail.owner.handle}`}
      </RouteLink>
      {detail.description !== "" && <p>{detail.description}</p>}
      <div className="web-hub-tags">
        {detail.tags.map((tag) => (
          <Badge key={tag} tone="neutral">
            {tag}
          </Badge>
        ))}
      </div>
    </header>
  );
}

type VersionActionsProps = Actions & {
  readonly kind: PublicationDetail["kind"];
  readonly version: PublishedVersion;
};

function VersionActions({ kind, version, onOpenCopy, onInstall }: VersionActionsProps) {
  const [isInstalled, setInstalled] = useState(false);
  const catalog = snapshotOf(version).catalog;
  const install = (manifest: NodeManifest) => {
    onInstall(installable(manifest, version.flow, catalog));
    setInstalled(true);
  };
  return (
    <div className="web-hub-actions">
      <Button
        icon="copy"
        onClick={() => {
          onOpenCopy(withoutPrivateParams(version.flow, catalog));
        }}
      >
        {MESSAGES.hub.openCopy}
      </Button>
      {kind === "node" && version.manifest !== undefined && (
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            if (version.manifest) install(version.manifest);
          }}
        >
          {MESSAGES.hub.install}
        </Button>
      )}
      {isInstalled && <span role="status">{MESSAGES.hub.installed}</span>}
    </div>
  );
}

/** The node and the custom nodes it uses, without private params (ADR 0018, point 8). */
function installable(manifest: NodeManifest, flow: Flow, catalog: ReadonlyArray<NodeManifest>) {
  const manifests = manifestsToInstall(manifest, flow.customNodes ?? []);
  return (
    withoutPrivateParams({ ...flow, nodes: [], customNodes: [...manifests] }, catalog)
      .customNodes ?? []
  );
}

const versionOptions = (detail: PublicationDetail) =>
  detail.versions.map(({ version, hasState }) => ({
    value: version,
    label: hasState ? `${version} · ${MESSAGES.hub.withState}` : version,
  }));

const snapshotOf = (version: PublishedVersion) =>
  version.snapshot ?? { format: SNAPSHOT_FORMAT, catalog: [] };

function usePublication(handle: string, slug: string) {
  const hub = useHub();
  return useHubQuery(useCallback(() => hub.publication(handle, slug), [hub, handle, slug]));
}

function usePublishedVersion(publicationId: string, version: string) {
  const hub = useHub();
  return useHubQuery(
    useCallback(() => hub.version(publicationId, version), [hub, publicationId, version]),
  );
}
