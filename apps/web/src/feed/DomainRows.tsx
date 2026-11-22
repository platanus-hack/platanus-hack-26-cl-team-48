import type { DomainDepth } from "@nodomics/profile";
import { Field, Icon, ICON_SIZE, useFieldControlId } from "@nodomics/ui";
import { useId, useState } from "react";
import { MESSAGES } from "../messages.ts";
import type { DomainDraft } from "./card-draft.ts";

const DEPTHS = ["curious", "practitioner", "expert"] as const satisfies ReadonlyArray<DomainDepth>;
const DEFAULT_DEPTH: DomainDepth = "curious";
const TEXT = MESSAGES.feed.wizard.help;

type DomainRowsProps = {
  readonly domains: ReadonlyArray<DomainDraft>;
  readonly onChange: (domains: ReadonlyArray<DomainDraft>) => void;
};

/** The second axis of the card: the topics the person knows and how deeply. */
export function DomainRows({ domains, onChange }: DomainRowsProps) {
  const add = (text: string) => {
    const name = text.trim();
    if (name === "" || domains.some((domain) => domain.name === name)) return;
    onChange([...domains, { name, depth: DEFAULT_DEPTH }]);
  };
  const replace = (next: DomainDraft) => {
    onChange(domains.map((domain) => (domain.name === next.name ? next : domain)));
  };
  return (
    <div className="web-feed-topics">
      <Field label={TEXT.topics} help={TEXT.topicsHint}>
        <TopicTextbox onAdd={add} />
      </Field>
      {domains.length > 0 && (
        <ul className="web-feed-topic-list">
          {domains.map((domain) => (
            <TopicRow
              key={domain.name}
              domain={domain}
              onChange={replace}
              onRemove={() => {
                onChange(domains.filter(({ name }) => name !== domain.name));
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicTextbox({ onAdd }: { readonly onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <input
      id={useFieldControlId()}
      className="web-feed-chip-textbox web-feed-topic-textbox"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onAdd(text);
        setText("");
      }}
    />
  );
}

type TopicRowProps = {
  readonly domain: DomainDraft;
  readonly onChange: (domain: DomainDraft) => void;
  readonly onRemove: () => void;
};

function TopicRow({ domain, onChange, onRemove }: TopicRowProps) {
  const name = useId();
  return (
    <li className="web-feed-topic">
      <span className="web-feed-topic-name">{domain.name}</span>
      <div className="web-feed-segmented" role="radiogroup" aria-label={TEXT.level(domain.name)}>
        {DEPTHS.map((depth) => (
          <label key={depth} className="web-feed-segment">
            <input
              type="radio"
              name={name}
              checked={domain.depth === depth}
              onChange={() => {
                onChange({ ...domain, depth });
              }}
            />
            <span>{TEXT.depth[depth]}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="web-feed-chip-remove"
        aria-label={MESSAGES.feed.chips.remove(domain.name)}
        onClick={onRemove}
      >
        <Icon name="x" size={ICON_SIZE.sm} />
      </button>
    </li>
  );
}
