import type { DomainDepth } from "@nodomics/profile";
import { Button, Field, Input, Select } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { NEW_DOMAIN, type DomainDraft } from "./card-draft.ts";

const DEPTHS = ["curious", "practitioner", "expert"] as const satisfies ReadonlyArray<DomainDepth>;
const DEPTH_OPTIONS = DEPTHS.map((value) => ({
  value,
  label: MESSAGES.feed.card.depth[value],
}));

type DomainRowsProps = {
  readonly domains: ReadonlyArray<DomainDraft>;
  readonly onChange: (domains: ReadonlyArray<DomainDraft>) => void;
};

/** The second axis of the card: what the person knows and how deeply. */
export function DomainRows({ domains, onChange }: DomainRowsProps) {
  const replaceAt = (position: number, domain: DomainDraft) => {
    onChange(domains.map((current, index) => (index === position ? domain : current)));
  };
  return (
    <div className="web-feed-domain-rows">
      {domains.map((domain, position) => (
        <div key={position} className="web-feed-domain-row">
          <Field label={MESSAGES.feed.editor.domain}>
            <Input
              value={domain.name}
              onChange={(name) => {
                replaceAt(position, { ...domain, name });
              }}
            />
          </Field>
          <Field label={MESSAGES.feed.editor.depth}>
            <Select
              options={DEPTH_OPTIONS}
              value={domain.depth}
              onChange={(depth) => {
                replaceAt(position, { ...domain, depth: depth as DomainDepth });
              }}
            />
          </Field>
          <Button
            variant="ghost"
            icon="x"
            label={MESSAGES.feed.editor.removeDomain}
            onClick={() => {
              onChange(domains.filter((_, index) => index !== position));
            }}
          />
        </div>
      ))}
      <Button
        icon="plus"
        onClick={() => {
          onChange([...domains, NEW_DOMAIN]);
        }}
      >
        {MESSAGES.feed.editor.addDomain}
      </Button>
    </div>
  );
}
