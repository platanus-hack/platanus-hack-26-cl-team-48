import type { TechnicalLevel } from "@nodomics/profile";
import { Icon, type IconName } from "@nodomics/ui";
import { useId } from "react";
import { MESSAGES } from "../messages.ts";

const LEVELS = ["uses", "builds", "codes"] as const satisfies ReadonlyArray<TechnicalLevel>;
const LEVEL_ICONS: Readonly<Record<TechnicalLevel, IconName>> = {
  uses: "play",
  builds: "workflow",
  codes: "code",
};
const TEXT = MESSAGES.feed.wizard.about;

type TechnicalChoiceProps = {
  readonly level: TechnicalLevel;
  readonly onChange: (level: TechnicalLevel) => void;
};

/** How the person relates to Nodomics: the first axis of the card (ADR 0022 §2). */
export function TechnicalChoice({ level, onChange }: TechnicalChoiceProps) {
  const name = useId();
  const heading = useId();
  return (
    <div className="web-feed-choice-group">
      <p id={heading} className="web-feed-question">
        {TEXT.technical}
      </p>
      <div className="web-feed-choices" role="radiogroup" aria-labelledby={heading}>
        {LEVELS.map((option) => (
          <LevelCard
            key={option}
            group={name}
            level={option}
            isChecked={level === option}
            onSelect={() => {
              onChange(option);
            }}
          />
        ))}
      </div>
    </div>
  );
}

type LevelCardProps = {
  readonly group: string;
  readonly level: TechnicalLevel;
  readonly isChecked: boolean;
  readonly onSelect: () => void;
};

/** The whole card is clickable; the radio is named by the title and described by the hint. */
function LevelCard({ group, level, isChecked, onSelect }: LevelCardProps) {
  const title = useId();
  const hint = useId();
  return (
    <label className="web-feed-choice">
      <input
        type="radio"
        name={group}
        checked={isChecked}
        aria-labelledby={title}
        aria-describedby={hint}
        onChange={onSelect}
      />
      <Icon name={LEVEL_ICONS[level]} />
      <span id={title} className="web-feed-choice-title">
        {TEXT.levels[level].title}
      </span>
      <span id={hint} className="web-feed-choice-hint">
        {TEXT.levels[level].hint}
      </span>
    </label>
  );
}
