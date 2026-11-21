import { Field, Input } from "@nodomics/ui";
import { useState, type SubmitEvent } from "react";
import { useSecretNames } from "./use-secret-names.ts";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { DeleteAction } from "./SavedFlowList.tsx";

export function Credentials() {
  const names = useSecretNames();
  return (
    <div className="web-saved-list">
      <p>{MESSAGES.secrets.warning}</p>
      <CredentialForm names={names} />
      {names.length === 0 && <p>{MESSAGES.secrets.empty}</p>}
      {names.map((name) => (
        <CredentialCard key={name} name={name} />
      ))}
    </div>
  );
}

function CredentialCard({ name }: { readonly name: string }) {
  const { secretStore } = useAppStores();
  return (
    <article className="web-saved-card" aria-label={name}>
      <h3>{name}</h3>
      <DeleteAction onDelete={() => secretStore.getState().remove(name)} />
    </article>
  );
}

function useCredentialForm() {
  const { secretStore } = useAppStores();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const save = async () => {
    if (name.trim() === "" || value === "") return;
    await secretStore.getState().save({ name: name.trim(), value });
    setName("");
    setValue("");
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save();
  };
  return { name, value, setName, setValue, submit };
}

type CredentialFormState = ReturnType<typeof useCredentialForm>;
function CredentialForm({ names }: { readonly names: ReadonlyArray<string> }) {
  const form = useCredentialForm();
  return (
    <form className="web-saved-actions" onSubmit={form.submit}>
      <CredentialInputs form={form} />
      <CredentialSave form={form} names={names} />
    </form>
  );
}

function CredentialInputs({ form }: { readonly form: CredentialFormState }) {
  return (
    <>
      <Field label={MESSAGES.secrets.name}>
        <Input value={form.name} onChange={form.setName} />
      </Field>
      <Field label={MESSAGES.secrets.value}>
        <Input type="password" value={form.value} onChange={form.setValue} />
      </Field>
    </>
  );
}

function CredentialSave({
  form,
  names,
}: {
  readonly form: CredentialFormState;
  readonly names: ReadonlyArray<string>;
}) {
  return (
    <button
      className="nd-btn nd-btn-secondary nd-btn-md"
      type="submit"
      disabled={form.name.trim() === "" || form.value === ""}
    >
      {names.includes(form.name.trim()) ? MESSAGES.secrets.replace : MESSAGES.secrets.add}
    </button>
  );
}
