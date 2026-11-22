import { Field, Icon, ICON_SIZE, useFieldControlId } from "@nodomics/ui";
import { useState, type KeyboardEvent } from "react";
import { MESSAGES } from "../messages.ts";

type ChipInputProps = {
  readonly label: string;
  readonly help?: string;
  readonly values: ReadonlyArray<string>;
  readonly onChange: (values: string[]) => void;
};

const ADD_KEYS: ReadonlySet<string> = new Set(["Enter", ","]);

/** A list of short entries typed one at a time: Enter or a comma turns the text into a chip. */
export function ChipInput({ label, help, values, onChange }: ChipInputProps) {
  const add = (text: string) => {
    const entry = text.trim();
    if (entry === "" || values.includes(entry)) return;
    onChange([...values, entry]);
  };
  return (
    <Field label={label} {...(help === undefined ? {} : { help })}>
      <div className="web-feed-chips">
        <ChipList label={label} values={values} onChange={onChange} />
        <ChipTextbox onAdd={add} />
      </div>
    </Field>
  );
}

function ChipList({ label, values, onChange }: Omit<ChipInputProps, "help">) {
  if (values.length === 0) return null;
  return (
    <ul className="web-feed-chip-list" aria-label={label}>
      {values.map((value) => (
        <li key={value} className="web-feed-chip">
          {value}
          <button
            type="button"
            className="web-feed-chip-remove"
            aria-label={MESSAGES.feed.chips.remove(value)}
            onClick={() => {
              onChange(values.filter((current) => current !== value));
            }}
          >
            <Icon name="x" size={ICON_SIZE.xs} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The free text box; the pending text becomes a chip on Enter, comma or leaving the box. */
function ChipTextbox({ onAdd }: { readonly onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const commit = () => {
    onAdd(text);
    setText("");
  };
  return (
    <input
      id={useFieldControlId()}
      className="web-feed-chip-textbox"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (!ADD_KEYS.has(event.key)) return;
        event.preventDefault();
        commit();
      }}
      onBlur={commit}
    />
  );
}
