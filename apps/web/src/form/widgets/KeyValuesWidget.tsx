import { Button, Field, Input, Select, Switch } from "@nodomics/ui";
import { useSecretNames } from "../../library/use-secret-names.ts";
import { MESSAGES } from "../../messages.ts";
import { keyValuesOf, type KeyValue } from "../key-values.ts";
import type { WidgetProps } from "../widget-props.ts";

type RowProps = {
  readonly item: KeyValue;
  readonly onChange: (item: KeyValue) => void;
  readonly onRemove: () => void;
};
type EntryProps = Omit<RowProps, "onRemove">;

export function KeyValuesWidget(props: WidgetProps<"key-values">) {
  return (
    <div className="web-object-list" role="group" aria-label={props.field.label}>
      <KeyValueRows {...props} />
      <Button
        size="sm"
        onClick={() => {
          props.onChange([...keyValuesOf(props.value), { name: "", value: "" }]);
        }}
      >
        {MESSAGES.params.addItem}
      </Button>
    </div>
  );
}

function KeyValueRows({ value, onChange }: WidgetProps<"key-values">) {
  const items = keyValuesOf(value);
  return items.map((item, index) => (
    <KeyValueRow
      key={index}
      item={item}
      onChange={(entry) => {
        onChange(items.map((current, at) => (at === index ? entry : current)));
      }}
      onRemove={() => {
        onChange(items.filter((_, at) => at !== index));
      }}
    />
  ));
}

function KeyValueRow({ item, onChange, onRemove }: RowProps) {
  return (
    <div className="web-object-item">
      <EntryName item={item} onChange={onChange} />
      <CredentialSwitch item={item} onChange={onChange} />
      <EntryValue item={item} onChange={onChange} />
      <Button size="sm" variant="ghost" onClick={onRemove}>
        {MESSAGES.params.removeItem}
      </Button>
    </div>
  );
}

function EntryName({ item, onChange }: EntryProps) {
  return (
    <Field label={MESSAGES.secrets.name}>
      <Input
        value={item.name}
        onChange={(name) => {
          onChange({ ...item, name });
        }}
      />
    </Field>
  );
}

function CredentialSwitch({ item, onChange }: EntryProps) {
  return (
    <Field label={MESSAGES.secrets.use}>
      <Switch
        checked={item.secret !== undefined}
        onChange={(checked) => {
          onChange(checked ? { name: item.name, secret: "" } : { name: item.name, value: "" });
        }}
      />
    </Field>
  );
}

function EntryValue({ item, onChange }: EntryProps) {
  if (item.secret !== undefined)
    return (
      <CredentialSelect
        name={item.secret}
        onChange={(secret) => {
          onChange({ name: item.name, secret });
        }}
      />
    );
  return <LiteralValue item={item} onChange={onChange} />;
}

function LiteralValue({ item, onChange }: EntryProps) {
  return (
    <Field label={MESSAGES.secrets.value}>
      <Input
        value={item.value ?? ""}
        onChange={(value) => {
          onChange({ name: item.name, value });
        }}
      />
    </Field>
  );
}

type SelectProps = { readonly name: string; readonly onChange: (name: string) => void };
function CredentialSelect({ name, onChange }: SelectProps) {
  const names = useSecretNames();
  const isMissing = name !== "" && !names.includes(name);
  return (
    <Field
      label={MESSAGES.secrets.select}
      {...(isMissing ? { error: MESSAGES.secrets.missing(name) } : {})}
    >
      <Select value={name} onChange={onChange} options={credentialOptions(name, names)} />
    </Field>
  );
}

function credentialOptions(name: string, names: ReadonlyArray<string>) {
  return [
    { value: "", label: MESSAGES.secrets.none },
    ...names,
    ...(name !== "" && !names.includes(name) ? [name] : []),
  ];
}
