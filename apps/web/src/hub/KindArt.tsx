import type { PublicationKind } from "@nodomics/hub";

const VIEW_BOX = "0 0 240 96";

/** The cover of a card: a small graph for a flow, a single node with its ports for a node. */
export function KindArt({ kind }: { readonly kind: PublicationKind }) {
  return (
    <svg className="web-kind-art" viewBox={VIEW_BOX} aria-hidden="true">
      {kind === "flow" ? <FlowArt /> : <NodeArt />}
    </svg>
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
