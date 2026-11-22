import type { ReactNode } from "react";
import { MESSAGES } from "../messages.ts";
import { IconChip } from "./IconChip.tsx";
import { KindArt } from "./KindArt.tsx";
import type { IconName } from "@nodomics/ui";

const { shareTitle, share } = MESSAGES.hub.landing;

/** What can be shared, each with a miniature of its own kind. */
export function HubShare() {
  const art: ReadonlyArray<ReactNode> = [
    <KindArt key="app" kind="flow" />,
    <div key="module" className="web-hub-share-module">
      <KindArt kind="flow" />
    </div>,
    <KindArt key="node" kind="node" />,
  ];
  const kinds = ["flow", "flow", "node"] as const;
  const icons: ReadonlyArray<IconName> = ["app-window", "boxes", "calculator"];
  return (
    <section className="web-hub-landing-inner web-hub-share" aria-labelledby="web-hub-share">
      <h2 id="web-hub-share">{shareTitle}</h2>
      <ul className="web-hub-share-tiles">
        {share.map(({ title, text }, index) => (
          <li key={title} className="web-hub-share-tile">
            <div className="web-hub-share-art" data-kind={kinds[index]}>
              {art[index]}
            </div>
            <IconChip name={icons[index] ?? "boxes"} />
            <b>{title}</b>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
