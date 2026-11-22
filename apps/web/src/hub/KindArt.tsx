import type { PublicationKind } from "@nodomics/hub";

const VIEW_BOX = "0 0 240 96";

/** The cover of a card: an app layout for an app, a small graph for a flow, a single node with its ports for a node. */
export function KindArt({ kind }: { readonly kind: PublicationKind }) {
  return (
    <svg className="web-kind-art" viewBox={VIEW_BOX} aria-hidden="true">
      {kind === "app" ? <AppArt /> : kind === "flow" ? <FlowArt /> : <NodeArt />}
    </svg>
  );
}

function AppArt() {
  return (
    <>
      <rect x="24" y="16" width="192" height="64" rx="6" />
      <line x1="24" y1="32" x2="216" y2="32" />
      <circle cx="36" cy="24" r="2.5" />
      <circle cx="44" cy="24" r="2.5" />
      <circle cx="52" cy="24" r="2.5" />
      <line x1="72" y1="32" x2="72" y2="80" />
      <rect x="82" y="38" width="56" height="34" rx="4" className="web-kind-art-accent" />
      <rect x="146" y="38" width="60" height="15" rx="3" />
      <rect x="146" y="57" width="60" height="15" rx="3" />
    </>
  );
}

function FlowArt() {
  return (
    <>
      <path d="M68 30 C94 30 94 48 120 48 M68 66 C94 66 94 48 120 48 M164 48 C180 48 180 48 196 48" />
      <rect x="20" y="20" width="48" height="20" rx="5" />
      <rect x="20" y="56" width="48" height="20" rx="5" />
      <rect x="120" y="38" width="44" height="20" rx="5" className="web-kind-art-accent" />
      <rect x="196" y="38" width="28" height="20" rx="5" />
    </>
  );
}

function NodeArt() {
  return (
    <>
      <path d="M40 48 H84 M156 38 H200 M156 58 H200" />
      <rect x="84" y="24" width="72" height="48" rx="7" className="web-kind-art-accent" />
      <circle cx="84" cy="48" r="4" />
      <circle cx="156" cy="38" r="4" />
      <circle cx="156" cy="58" r="4" />
    </>
  );
}
