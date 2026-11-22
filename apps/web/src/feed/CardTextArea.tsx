import { Field, useFieldControlId } from "@nodomics/ui";

type CardTextAreaProps = {
  readonly label: string;
  readonly help?: string;
  readonly placeholder?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
};

/** A multi-line text field; the design system has no textarea yet (requested in the report). */
export function CardTextArea({ label, help, placeholder, value, onChange }: CardTextAreaProps) {
  return (
    <Field label={label} {...(help === undefined ? {} : { help })}>
      <TextAreaControl value={value} placeholder={placeholder ?? ""} onChange={onChange} />
    </Field>
  );
}

function TextAreaControl({
  value,
  placeholder,
  onChange,
}: Pick<CardTextAreaProps, "value" | "onChange"> & { readonly placeholder: string }) {
  return (
    <textarea
      id={useFieldControlId()}
      className="web-feed-textarea"
      value={value}
      placeholder={placeholder}
      rows={3}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
