import type { PublicationKind } from "@nodomics/hub";
import { Field, Input, Notice, Select } from "@nodomics/ui";
import { useCallback, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { useHub } from "./hub-context.ts";
import { PublicationList } from "./PublicationCard.tsx";
import { useHubQuery } from "./use-hub-query.ts";

const SEARCH_DELAY_MS = 200;
const ALL = "all";
type KindFilter = PublicationKind | typeof ALL;
const KIND_OPTIONS = (["all", "flow", "node"] as const).map((value) => ({
  value,
  label: MESSAGES.hub.kinds[value],
}));

/** Search of everything published (ADR 0018, `/hub`). */
export function HubPage() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<KindFilter>(ALL);
  const results = useSearch(text, kind);
  return (
    <main className="web-hub-page">
      <h1>{MESSAGES.hub.title}</h1>
      <div className="web-hub-filters">
        <Field label={MESSAGES.hub.search}>
          <Input type="search" icon="search" value={text} onChange={setText} />
        </Field>
        <Field label={MESSAGES.hub.kind}>
          <Select
            options={KIND_OPTIONS}
            value={kind}
            onChange={(value) => {
              setKind(toKindFilter(value));
            }}
          />
        </Field>
      </div>
      {results.status === "failed" && <Notice tone="error" title={MESSAGES.hub.failed} />}
      {results.status === "ready" && (
        <PublicationList publications={results.value} empty={MESSAGES.hub.noResults} />
      )}
    </main>
  );
}

function useSearch(text: string, kind: KindFilter) {
  const hub = useHub();
  const search = useCallback(
    () => hub.search({ text: text.trim(), ...(kind === ALL ? {} : { kind }) }),
    [hub, text, kind],
  );
  return useHubQuery(search, SEARCH_DELAY_MS);
}

const toKindFilter = (value: string): KindFilter =>
  value === "flow" || value === "node" ? value : ALL;
