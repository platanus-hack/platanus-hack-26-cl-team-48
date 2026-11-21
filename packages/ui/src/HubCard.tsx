import type { ReactNode } from "react";
import { formatNumber } from "./format-number.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";
import { MiniGraph } from "./MiniGraph.tsx";
import { TrustBadge } from "./TrustBadge.tsx";
import { TypeGlyph } from "./TypeGlyph.tsx";
import type { DataType, TrustLevel } from "./types.ts";

type HubKind = "node" | "flow" | "package" | "collection";

const KIND_ICONS: Record<HubKind, IconName> = {
  node: "workflow",
  flow: "workflow",
  package: "boxes",
  collection: "list-filter",
};

export type HubCardProps = {
  readonly kind: HubKind;
  readonly title: string;
  readonly author: string;
  readonly trust?: TrustLevel;
  readonly description?: string;
  readonly version?: string;
  readonly stars?: number;
  readonly uses?: number;
  readonly forks?: number;
  readonly updated?: string;
  readonly io?: { readonly in: ReadonlyArray<DataType>; readonly out: ReadonlyArray<DataType> };
  readonly thumbnail?: ReactNode;
};

export function HubCard(props: HubCardProps) {
  return (
    <article className="nd-hub">
      {props.kind === "flow" && (
        <div className="nd-hub-thumb">{props.thumbnail ?? <MiniGraph />}</div>
      )}
      <HubCardBody {...props} />
      <HubCardFooter {...props} />
    </article>
  );
}

function HubCardBody({ kind, title, author, trust, description, version, io }: HubCardProps) {
  return (
    <div className="nd-hub-body">
      <div className="nd-hub-kind">
        <Icon name={KIND_ICONS[kind]} size={ICON_SIZE.xs} />
        {MESSAGES.hubCard.kinds[kind]}
        {version !== undefined && <span className="nd-hub-ver">{version}</span>}
      </div>
      <h3 className="nd-hub-title">{title}</h3>
      <div className="nd-hub-author">
        {author}
        {trust !== undefined && <TrustBadge level={trust} />}
      </div>
      {description !== undefined && <p className="nd-hub-desc">{description}</p>}
      {io !== undefined && (
        <div className="nd-hub-io" role="group" aria-label={MESSAGES.hubCard.inputsToOutputs}>
          {io.in.map((type, index) => (
            <TypeGlyph key={`in-${String(index)}`} type={type} />
          ))}
          <Icon name="chevron-right" size={ICON_SIZE.xs} />
          {io.out.map((type, index) => (
            <TypeGlyph key={`out-${String(index)}`} type={type} />
          ))}
        </div>
      )}
    </div>
  );
}

function HubCardFooter({ stars = 0, uses = 0, forks, updated }: HubCardProps) {
  return (
    <div className="nd-hub-foot">
      <Counter icon="star" title={MESSAGES.hubCard.stars} value={stars} />
      <Counter icon="workflow" title={MESSAGES.hubCard.uses} value={uses} />
      {forks !== undefined && (
        <Counter icon="git-fork" title={MESSAGES.hubCard.forks} value={forks} />
      )}
      <span className="nd-hub-upd">{updated}</span>
    </div>
  );
}

function Counter({ icon, title, value }: { icon: IconName; title: string; value: number }) {
  return (
    <span title={title}>
      <Icon name={icon} size={ICON_SIZE.xs} />
      {formatNumber(value)}
    </span>
  );
}
