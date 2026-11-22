import type { PublicationDetail, PublishedVersion } from "@nodomics/hub";
import { SNAPSHOT_FORMAT } from "@nodomics/hub";
import type { Flow, NodeManifest } from "@nodomics/protocol";
import { Button, Field, Notice, Select } from "@nodomics/ui";
import { useCallback, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { Avatar } from "./Avatar.tsx";
import { FlowPreview } from "./FlowPreview.tsx";
import { withoutPrivateParams } from "./hub-flow.ts";
import { manifestsToInstall } from "./hub-install.ts";
import { useHub, useHubProfile } from "./hub-context.ts";
import { OwnFlowActions } from "./OwnFlowActions.tsx";
import { peekPendingHubAction } from "./pending-hub-action.ts";
import { SignInDialog } from "./SignInDialog.tsx";
import { useAccountAction } from "./use-account-action.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { EmptyState } from "./PublicationCard.tsx";
import { useQuery } from "../async/use-query.ts";

type PublicationPageProps = {
  readonly handle: string;
  readonly slug: string;
  readonly onOpenCopy: (flow: Flow) => void;
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onInstall: (manifests: ReadonlyArray<NodeManifest>) => void;
};
type Actions = Pick<PublicationPageProps, "onOpenCopy" | "onOpenEditor" | "onInstall">;

/** One publication with its versions, its preview and how to use it (ADR 0018, `/hub/<handle>/<slug>`). */
export function PublicationPage({ handle, slug, ...actions }: PublicationPageProps) {
  const detail = usePublication(handle, slug);
  if (detail.status === "loading") return <main className="web-hub-page" />;
  return (
    <main className="web-hub-page">
      {detail.status === "failed" && <Notice tone="error" title={MESSAGES.hub.failed} />}
      {detail.status === "ready" &&
        (detail.value === undefined ? (
          <EmptyState text={MESSAGES.hub.noPublication} />
        ) : (
          <PublicationView key={detail.value.id} detail={detail.value} {...actions} />
        ))}
    </main>
  );
}

function PublicationView({ detail, ...actions }: { readonly detail: PublicationDetail } & Actions) {
  // After signing in to copy or install, come back to the version that was chosen.
  const [selected, select] = useState(
    () => pendingVersion(detail) ?? detail.versions[0]?.version ?? "",
  );
  const version = usePublishedVersion(detail.id, selected);
  return (
    <>
      <PublicationHeader detail={detail} />
      <div className="web-hub-detail">
        <div className="web-hub-detail-main">
          {version.status === "failed" && <Notice tone="error" title={MESSAGES.hub.failed} />}
          {version.status === "ready" && (
            <FlowPreview flow={version.value.flow} snapshot={snapshotOf(version.value)} />
          )}
        </div>
        <aside className="web-hub-detail-side">
          <section className="web-hub-panel" aria-label={MESSAGES.hub.use}>
            <Field label={MESSAGES.hub.version}>
              <Select options={versionOptions(detail)} value={selected} onChange={select} />
            </Field>
            {version.status === "ready" && (
              <VersionActions detail={detail} version={version.value} {...actions} />
            )}
            <p className="web-hub-muted">
              {detail.kind === "node" ? MESSAGES.hub.nodeHint : MESSAGES.hub.flowHint}
            </p>
          </section>
          <PublicationFacts detail={detail} selected={selected} />
        </aside>
      </div>
    </>
  );
}

function PublicationHeader({ detail }: { readonly detail: PublicationDetail }) {
  return (
    <div className="web-hub-publication">
      <span className="web-kind-tag" data-kind={detail.kind}>
        {MESSAGES.hub.kindLabel[detail.kind]}
      </span>
      <h1>{detail.title}</h1>
      {detail.description !== "" && <p className="web-hub-lead">{detail.description}</p>}
      <div className="web-hub-tags">
        {detail.tags.map((tag) => (
          <span key={tag} className="web-hub-tag">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

type FactsProps = { readonly detail: PublicationDetail; readonly selected: string };

function PublicationFacts({ detail, selected }: FactsProps) {
  const createdAt = detail.versions.find(({ version }) => version === selected)?.createdAt;
  return (
    <dl className="web-hub-panel web-hub-facts">
      <dt>{MESSAGES.hub.by}</dt>
      <dd>
        <RouteLink
          route={{ page: "profile", handle: detail.owner.handle }}
          className="web-hub-owner"
        >
          <Avatar name={detail.owner.displayName} url={detail.owner.avatarUrl} />
          {`@${detail.owner.handle}`}
        </RouteLink>
      </dd>
      {createdAt !== undefined && (
        <>
          <dt>{MESSAGES.hub.published}</dt>
          <dd>{DATE_FORMAT.format(new Date(createdAt))}</dd>
        </>
      )}
      <dt>{MESSAGES.hub.license}</dt>
      <dd className="web-hub-mono">{detail.license}</dd>
    </dl>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

type VersionActionsProps = Actions & {
  readonly detail: PublicationDetail;
  readonly version: PublishedVersion;
};

const pendingVersion = (detail: PublicationDetail) =>
  peekPendingHubAction(window.sessionStorage, { handle: detail.owner.handle, slug: detail.slug })
    ?.version;

function VersionActions({
  detail,
  version,
  onOpenCopy,
  onOpenEditor,
  onInstall,
}: VersionActionsProps) {
  const { kind } = detail;
  const [isInstalled, setInstalled] = useState(false);
  const isMine = useHubProfile()?.handle === detail.owner.handle;
  const catalog = snapshotOf(version).catalog;
  const { manifest } = version;
  const account = useAccountAction(
    { handle: detail.owner.handle, slug: detail.slug, version: version.version },
    (action) => {
      if (action === "copy") onOpenCopy(withoutPrivateParams(version.flow, catalog));
      else if (manifest !== undefined) {
        onInstall(installable(manifest, version.flow, catalog));
        setInstalled(true);
      }
    },
  );
  return (
    <div className="web-hub-actions">
      {isMine ? (
        <OwnFlowActions
          detail={detail}
          version={version.version}
          flow={withoutPrivateParams(version.flow, catalog)}
          onOpenEditor={onOpenEditor}
          onOpenCopy={onOpenCopy}
        />
      ) : (
        <Button
          variant={kind === "flow" ? "primary" : "secondary"}
          icon="copy"
          onClick={() => {
            account.request("copy");
          }}
        >
          {MESSAGES.hub.openCopy}
        </Button>
      )}
      {kind === "node" && manifest !== undefined && (
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            account.request("install");
          }}
        >
          {MESSAGES.hub.install}
        </Button>
      )}
      {account.isAsking && <SignInDialog onClose={account.cancel} />}
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
  return useQuery(useCallback(() => hub.publication(handle, slug), [hub, handle, slug]));
}

function usePublishedVersion(publicationId: string, version: string) {
  const hub = useHub();
  return useQuery(
    useCallback(() => hub.version(publicationId, version), [hub, publicationId, version]),
  );
}
