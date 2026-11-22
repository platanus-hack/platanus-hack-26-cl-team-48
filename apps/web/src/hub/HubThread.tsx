import { MESSAGES } from "../messages.ts";

const { thread, threadLabel } = MESSAGES.hub.landing;

/** Three knots on one thread: find, adapt, receive improvements. */
export function HubThread() {
  return (
    <section className="web-hub-thread" aria-label={threadLabel}>
      <ol className="web-hub-thread-steps">
        {thread.map(({ title, text }) => (
          <li key={title}>
            <b>{title}</b>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
