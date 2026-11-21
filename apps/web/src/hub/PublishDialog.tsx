import { isValidSlug, type HubError, type Snapshot } from "@nodomics/hub";
import type { Flow, NodeManifest } from "@nodomics/protocol";
import { Button, Field, Input, Notice } from "@nodomics/ui";
import { useId, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { HubDialog } from "./HubDialog.tsx";
import { useHub, useHubProfile } from "./hub-context.ts";
import { publicationContent } from "./publication-content.ts";
import { tagsOf, usePublishForm, type PublishForm } from "./use-publish-form.ts";

export type PublishSource = {
  readonly flowId: string;
  readonly title: string;
  readonly flow: Flow;
  readonly catalog: ReadonlyArray<NodeManifest>;
};

type PublishDialogProps = {
  readonly source: PublishSource;
  readonly record: (includeState: boolean) => Promise<Snapshot>;
  readonly onClose: () => void;
};

type Outcome =
  | { readonly status: "editing" | "publishing" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "published"; readonly handle: string; readonly slug: string };

/** Publishes the open flow to the hub: as a flow, or as a node when it has a node entry (ADR 0018). */
export function PublishDialog({ source, record, onClose }: PublishDialogProps) {
  const editor = usePublishForm(source.title);
  const [outcome, publish] = usePublish(source, record);
  return (
    <HubDialog title={MESSAGES.publish.title} onClose={onClose}>
      <div className="web-hub-form">
        <PublishFields {...editor} />
        <OutcomeMessage outcome={outcome} />
        <footer className="web-hub-dialog-actions">
          <Button variant="ghost" onClick={onClose}>
            {MESSAGES.publish.cancel}
          </Button>
          <Button
            variant="primary"
            icon="upload"
            disabled={!isValidSlug(editor.form.slug)}
            loading={outcome.status === "publishing"}
            onClick={() => {
              publish(editor.form);
            }}
          >
            {MESSAGES.publish.action}
          </Button>
        </footer>
      </div>
    </HubDialog>
  );
}

type Editor = ReturnType<typeof usePublishForm>;

function PublishFields({ form, change, setTitle, setSlug }: Editor) {
  return (
    <>
      <Field label={MESSAGES.publish.name}>
        <Input value={form.title} onChange={setTitle} />
      </Field>
      <SlugField slug={form.slug} onChange={setSlug} />
      <Field label={MESSAGES.publish.description}>
        <Input
          value={form.description}
          onChange={(description) => {
            change({ description });
          }}
        />
      </Field>
      <Field label={MESSAGES.publish.tags} help={MESSAGES.publish.tagsHelp}>
        <Input
          value={form.tags}
          onChange={(tags) => {
            change({ tags });
          }}
        />
      </Field>
      <Field label={MESSAGES.publish.version}>
        <Input
          value={form.version}
          mono
          onChange={(version) => {
            change({ version });
          }}
        />
      </Field>
      <StateChoice
        includeState={form.includeState}
        onChange={(includeState) => {
          change({ includeState });
        }}
      />
    </>
  );
}

/**
 * Like the design system's Field, but its rule is the input's description, so a screen reader
 * announces it with the field. (`Field` does not link its message yet; reported to its owner.)
 */
function SlugField({
  slug,
  onChange,
}: {
  readonly slug: string;
  readonly onChange: (slug: string) => void;
}) {
  const id = useId();
  const isInvalid = !isValidSlug(slug);
  return (
    <div className="nd-field">
      <label className="nd-field-label" htmlFor={id}>
        {MESSAGES.publish.slug}
      </label>
      <div className={isInvalid ? "nd-input nd-invalid" : "nd-input"}>
        <input
          id={id}
          value={slug}
          aria-invalid={isInvalid || undefined}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </div>
      <div
        id={`${id}-help`}
        className={isInvalid ? "nd-field-msg nd-field-msg-error" : "nd-field-msg"}
      >
        {MESSAGES.publish.slugHelp}
      </div>
    </div>
  );
}

function StateChoice({
  includeState,
  onChange,
}: {
  readonly includeState: boolean;
  readonly onChange: (includeState: boolean) => void;
}) {
  const name = useId();
  const options = [
    { value: false, label: MESSAGES.publish.onlyFlow },
    { value: true, label: MESSAGES.publish.withState },
  ];
  return (
    <fieldset className="web-hub-choice" role="radiogroup" aria-label={MESSAGES.publish.what}>
      <legend>{MESSAGES.publish.what}</legend>
      {options.map((option) => (
        <label key={option.label}>
          <input
            type="radio"
            name={name}
            checked={includeState === option.value}
            onChange={() => {
              onChange(option.value);
            }}
          />
          {option.label}
        </label>
      ))}
      {includeState && <p className="web-hub-warning">{MESSAGES.publish.stateWarning}</p>}
    </fieldset>
  );
}

function OutcomeMessage({ outcome }: { readonly outcome: Outcome }) {
  if (outcome.status === "failed") return <Notice tone="error" title={outcome.message} />;
  if (outcome.status !== "published") return null;
  return (
    <Notice tone="ok" title={MESSAGES.publish.done}>
      <RouteLink route={{ page: "publication", handle: outcome.handle, slug: outcome.slug }}>
        {MESSAGES.publish.view}
      </RouteLink>
    </Notice>
  );
}

function usePublish(source: PublishSource, record: PublishDialogProps["record"]) {
  const hub = useHub();
  const profile = useHubProfile();
  const [outcome, setOutcome] = useState<Outcome>({ status: "editing" });
  const fail = (message: string) => {
    setOutcome({ status: "failed", message });
  };
  const publish = async (form: PublishForm) => {
    if (profile === undefined) {
      fail(errorMessage({ kind: "signed-out" }));
      return;
    }
    const version = form.version.trim();
    const content = publicationContent(source, {
      handle: profile.handle,
      slug: form.slug,
      version,
    });
    if (!content.ok) {
      fail(MESSAGES.publish.asNode(MESSAGES.flowNodes.issues[content.error]));
      return;
    }
    setOutcome({ status: "publishing" });
    const result = await hub.publish({
      ...content.value,
      slug: form.slug,
      title: form.title.trim(),
      description: form.description.trim(),
      tags: tagsOf(form.tags),
      version,
      snapshot: await record(form.includeState),
    });
    if (!result.ok) {
      fail(errorMessage(result.error));
      return;
    }
    setOutcome({ status: "published", handle: profile.handle, slug: form.slug });
  };
  return [
    outcome,
    (form: PublishForm) => {
      void publish(form);
    },
  ] as const;
}

const errorMessage = (error: HubError) => MESSAGES.publish.errors[error.kind];
