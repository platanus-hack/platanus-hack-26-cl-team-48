import { Icon, type IconName } from "@nodomics/ui";
import { useId } from "react";
import { MESSAGES } from "../messages.ts";
import type { KindFilter } from "./hub-filters.ts";
import { KindArt } from "./KindArt.tsx";

const TEXT = MESSAGES.hub.hero;

/** The welcome for visitors: what Nodomics is, and a door for each kind of person. */
export function HubHero({ onKind }: { readonly onKind: (kind: KindFilter) => void }) {
  const heading = useId();
  return (
    <section className="web-hub-hero" aria-labelledby={heading}>
      <div className="web-hub-hero-text">
        <h2 id={heading}>{TEXT.title}</h2>
        <p className="web-hub-lead">{TEXT.lead}</p>
        <div className="web-hub-doors">
          <Door
            icon="users"
            label={TEXT.domain}
            hint={TEXT.domainHint}
            onClick={() => {
              onKind("flow");
            }}
          />
          <Door
            icon="workflow"
            label={TEXT.code}
            hint={TEXT.codeHint}
            onClick={() => {
              onKind("node");
            }}
          />
        </div>
      </div>
      <div className="web-hub-hero-art">
        <KindArt kind="flow" />
      </div>
    </section>
  );
}

function Door(props: {
  readonly icon: IconName;
  readonly label: string;
  readonly hint: string;
  readonly onClick: () => void;
}) {
  const label = useId();
  const hint = useId();
  return (
    <button
      type="button"
      className="web-hub-door"
      aria-labelledby={label}
      aria-describedby={hint}
      onClick={props.onClick}
    >
      <Icon name={props.icon} />
      <span id={label} className="web-hub-door-label">
        {props.label}
      </span>
      <span id={hint} className="web-hub-door-hint">
        {props.hint}
      </span>
    </button>
  );
}
