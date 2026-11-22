import type { ProfileCard } from "@nodomics/profile";
import { Button, Field, Input, Notice } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { CardTextArea } from "./CardTextArea.tsx";
import type { FeedService } from "./feed-service.ts";
import { DomainRows } from "./DomainRows.tsx";
import { RegistrationFields } from "./RegistrationFields.tsx";
import { TechnicalChoice } from "./TechnicalChoice.tsx";
import { useCardEditor } from "./use-card-editor.ts";

type ProfileCardEditorProps = {
  readonly feed: FeedService;
  readonly initial: ProfileCard | undefined;
  readonly onSaved: (card: ProfileCard) => void;
  readonly onCancel: () => void;
};

const LINK_FIELDS = ["linkedin", "github", "website"] as const;

/** Edits the own collaboration card, by hand or starting from a generated one. */
export function ProfileCardEditor({ feed, initial, onSaved, onCancel }: ProfileCardEditorProps) {
  const { draft, notice, busy, change, save, generate } = useCardEditor({ feed, initial, onSaved });
  return (
    <form
      className="web-hub-form"
      aria-label={MESSAGES.feed.editor.form}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <RegistrationFields
        isGenerating={busy === "generating"}
        isSaving={busy === "saving"}
        onGenerate={(sources) => void generate(sources)}
      />
      {notice !== undefined && (
        <Notice
          tone={notice.tone}
          title={notice.title}
          {...(notice.detail === undefined ? {} : { detail: notice.detail })}
        />
      )}
      <CardTextArea
        label={MESSAGES.feed.editor.about}
        value={draft.about}
        onChange={(about) => {
          change({ about });
        }}
      />
      <TechnicalChoice
        level={draft.technical}
        onChange={(technical) => {
          change({ technical });
        }}
      />
      <DomainRows
        domains={draft.domains}
        onChange={(domains) => {
          change({ domains });
        }}
      />
      <CardTextArea
        label={MESSAGES.feed.editor.offers}
        help={MESSAGES.feed.editor.listHelp}
        value={draft.offers}
        onChange={(offers) => {
          change({ offers });
        }}
      />
      <CardTextArea
        label={MESSAGES.feed.editor.seeks}
        help={MESSAGES.feed.editor.listHelp}
        value={draft.seeks}
        onChange={(seeks) => {
          change({ seeks });
        }}
      />
      {LINK_FIELDS.map((key) => (
        <Field key={key} label={MESSAGES.feed.editor[key]}>
          <Input
            value={draft[key]}
            onChange={(url) => {
              change({ [key]: url });
            }}
          />
        </Field>
      ))}
      <footer className="web-hub-dialog-actions">
        <Button variant="ghost" onClick={onCancel}>
          {MESSAGES.feed.editor.cancel}
        </Button>
        <Button
          variant="primary"
          loading={busy === "saving"}
          disabled={busy === "generating"}
          onClick={() => void save()}
        >
          {MESSAGES.feed.editor.save}
        </Button>
      </footer>
    </form>
  );
}
