import { Notice } from "@nodomics/ui";
import type { QueryState } from "../engine/use-engine-query.ts";
import { MESSAGES } from "../messages.ts";

/** What to show while a preview is not ready: loading, or why it failed. */
export function QueryStatus({ state }: { readonly state: QueryState<unknown> }) {
  if (state.status === "failed")
    return (
      <Notice tone="error" title={MESSAGES.preview.failed} detail={describeError(state.error)} />
    );
  return <p className="web-panel-hint">{MESSAGES.preview.loading}</p>;
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));
