import type { TechnicalLevel } from "@nodomics/profile";
import { useId } from "react";
import { MESSAGES } from "../messages.ts";

const LEVELS = ["uses", "builds", "codes"] as const satisfies ReadonlyArray<TechnicalLevel>;

type TechnicalChoiceProps = {
  readonly level: TechnicalLevel;
  readonly onChange: (level: TechnicalLevel) => void;
};

/** How the person relates to Nodomics: the first axis of the card (ADR 0022 §2). */
export function TechnicalChoice({ level, onChange }: TechnicalChoiceProps) {
  const name = useId();
  return (
    <fieldset
      className="web-hub-chips"
      role="radiogroup"
      aria-label={MESSAGES.feed.editor.technical}
    >
      {LEVELS.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={name}
            checked={level === option}
            onChange={() => {
              onChange(option);
            }}
          />
          {MESSAGES.feed.card.technical[option]}
        </label>
      ))}
    </fieldset>
  );
}
