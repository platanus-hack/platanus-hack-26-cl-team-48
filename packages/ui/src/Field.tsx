import { useId, type ReactNode } from "react";
import { Badge } from "./Badge.tsx";
import { Button } from "./Button.tsx";
import { FieldContext } from "./field-context.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import { MESSAGES } from "./messages.ts";

export type FieldProps = {
  readonly label: string;
  readonly help?: string;
  readonly error?: string;
  readonly optional?: boolean;
  readonly modified?: boolean;
  readonly exposed?: boolean;
  readonly linkedVar?: string;
  readonly info?: string;
  readonly onReset?: () => void;
  readonly children: ReactNode;
};

export function Field(props: FieldProps) {
  const id = useId();
  return (
    <div className="nd-field">
      <div className="nd-field-top">
        <label className="nd-field-label" htmlFor={id}>
          {props.label}
          {props.optional === true && (
            <span className="nd-field-opt">{MESSAGES.field.optional}</span>
          )}
        </label>
        <FieldTools {...props} />
      </div>
      <FieldContext value={{ id, isInvalid: props.error !== undefined }}>
        {props.children}
      </FieldContext>
      <FieldMessage {...props} />
    </div>
  );
}

function FieldTools({ modified, exposed, linkedVar, info, onReset }: FieldProps) {
  return (
    <span className="nd-field-tools">
      {exposed === true && (
        <Badge tone="accent" icon="arrow-right-left">
          {MESSAGES.field.exposed}
        </Badge>
      )}
      {linkedVar !== undefined && (
        <Badge tone="neutral" icon="hash">
          {linkedVar}
        </Badge>
      )}
      {modified === true && (
        <Button
          variant="ghost"
          size="sm"
          icon="rotate-ccw"
          label={MESSAGES.field.resetToDefault}
          onClick={onReset}
        />
      )}
      {info !== undefined && <Button variant="ghost" size="sm" icon="circle-help" label={info} />}
    </span>
  );
}

function FieldMessage({ error, help }: FieldProps) {
  if (error !== undefined) {
    return (
      <div className="nd-field-msg nd-field-msg-error" role="alert">
        <Icon name="circle-alert" size={ICON_SIZE.sm} />
        {error}
      </div>
    );
  }
  return help === undefined ? null : <div className="nd-field-msg">{help}</div>;
}
