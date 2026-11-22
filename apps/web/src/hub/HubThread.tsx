import type { IconName } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { IconChip } from "./IconChip.tsx";

const KNOT_ICONS: readonly IconName[] = ["search", "list-filter", "merge"];
const { thread, threadLabel } = MESSAGES.hub.landing;

/** Three knots on one thread: find, adapt, receive improvements. */
export function HubThread() {
  return (
    <section className="web-hub-band web-hub-thread" aria-label={threadLabel}>
      <ol className="web-hub-landing-inner web-hub-thread-steps">
        {thread.map(({ title, text }, index) => (
          <li key={title}>
            <span className="web-hub-thread-knot">
              <IconChip name={KNOT_ICONS[index] ?? "search"} />
            </span>
            <b>{title}</b>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
