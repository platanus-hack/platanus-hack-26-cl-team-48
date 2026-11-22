import { Field, useFieldControlId } from "@nodomics/ui";

type CardTextAreaProps = {
  readonly label: string;
  readonly help?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
};

/** A multi-line text field; the design system has no textarea yet (requested in the report). */
export function CardTextArea({ label, help, value, onChange }: CardTextAreaProps) {
  return (
    <Field label={label} {...(help === undefined ? {} : { help })}>
      <TextAreaControl value={value} onChange={onChange} />
    </Field>
  );
}

function TextAreaControl({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <textarea
      id={useFieldControlId()}
      className="web-feed-textarea"
      value={value}
      rows={3}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
