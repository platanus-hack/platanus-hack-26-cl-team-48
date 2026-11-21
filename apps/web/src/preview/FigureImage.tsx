import type { DisplayRef } from "@nodomics/protocol";
import { useEngineQuery } from "../engine/use-engine-query.ts";
import { describeFigure, toDataUrl } from "./figure-image.ts";
import { QueryStatus } from "./QueryStatus.tsx";

/** A figure the node's code showed, fetched from the engine that holds it. */
export function FigureImage({
  display,
  index,
}: {
  readonly display: DisplayRef;
  readonly index: number;
}) {
  const content = useEngineQuery(`display:${display.id}`, (session) => session.display(display.id));
  if (content.status !== "ready") return <QueryStatus state={content} />;
  return (
    <img
      className="web-figure"
      src={toDataUrl(content.value)}
      alt={describeFigure(display, index)}
      width={display.width}
      height={display.height}
    />
  );
}

/** Every figure a node showed, in the order its code showed them. */
export function FigureList({ displays }: { readonly displays: ReadonlyArray<DisplayRef> }) {
  return (
    <div className="web-figure-list">
      {displays.map((display, index) => (
        <FigureImage key={display.id} display={display} index={index} />
      ))}
    </div>
  );
}
