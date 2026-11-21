import type { PublicationKind } from "@nodomics/hub";
import { Input, Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
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
      <div className="web-hub-hero">
        <h1>{MESSAGES.hub.title}</h1>
        <p className="web-hub-lead">{MESSAGES.hub.subtitle}</p>
        <div className="web-hub-search">
          <Input
            type="search"
            icon="search"
            label={MESSAGES.hub.search}
            placeholder={MESSAGES.hub.search}
            value={text}
            onChange={setText}
          />
        </div>
        <KindChips kind={kind} onChange={setKind} />
      </div>
      <ForYouMockup />
      {results.status === "failed" && <Notice tone="error" title={MESSAGES.hub.failed} />}
      {results.status === "ready" && (
        <PublicationList publications={results.value} empty={MESSAGES.hub.noResults} />
      )}
    </main>
  );
}

function ForYouMockup() {
  const heading = useId();
  return (
    <section className="web-hub-for-you" aria-labelledby={heading}>
      <h2 id={heading}>{MESSAGES.hub.forYou}</h2>
      <p className="web-mockup-note">{MESSAGES.hub.forYouMockup}</p>
      <ul className="web-hub-for-you-list" aria-hidden="true">
        {MESSAGES.hub.forYouExamples.map((example) => (
          <li key={example.title} className="web-hub-for-you-card">
            <span className="web-hub-for-you-kind">{example.kind}</span>
            <strong>{example.title}</strong>
            <span className="web-hub-for-you-reason">{example.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function KindChips({
  kind,
  onChange,
}: {
  readonly kind: KindFilter;
  readonly onChange: (kind: KindFilter) => void;
}) {
  const name = useId();
  return (
    <fieldset className="web-hub-chips" role="radiogroup" aria-label={MESSAGES.hub.kind}>
      {KIND_OPTIONS.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            checked={kind === option.value}
            onChange={() => {
              onChange(option.value);
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
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
