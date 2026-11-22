import type { HubProfile } from "@nodomics/hub";
import type { ProfileCard } from "@nodomics/profile";
import { Button, Notice } from "@nodomics/ui";
import { useEffect, useRef, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { hasInvalidLinks } from "./card-draft.ts";
import type { FeedService } from "./feed-service.ts";
import { RegistrationFields } from "./RegistrationFields.tsx";
import { AboutStep, HelpStep, PreviewStep, SeekStep, StartStep } from "./ProfileWizardSteps.tsx";
import { useCardEditor, type EditorNotice } from "./use-card-editor.ts";

type NumberedStep = 1 | 2 | 3 | 4;
type Step = "start" | "cv" | NumberedStep;
type Busy = ReturnType<typeof useCardEditor>["busy"];

const TEXT = MESSAGES.feed.wizard;
const NUMBERED_STEPS = [1, 2, 3, 4] as const satisfies ReadonlyArray<NumberedStep>;
const STEP_COUNT = NUMBERED_STEPS.length;
const STEP_TITLES: Readonly<Record<Step, string>> = {
  start: TEXT.start.title,
  cv: TEXT.cv.title,
  1: TEXT.about.title,
  2: TEXT.help.title,
  3: TEXT.seek.title,
  4: TEXT.preview.title,
};

type ProfileWizardProps = {
  readonly feed: FeedService;
  readonly profile: HubProfile | undefined;
  readonly initial: ProfileCard | undefined;
  readonly onSaved: (card: ProfileCard) => void;
  readonly onCancel: () => void;
};

/** Builds or edits the own collaboration card one short question at a time. */
export function ProfileWizard({ feed, profile, initial, onSaved, onCancel }: ProfileWizardProps) {
  const editor = useCardEditor({ feed, initial, onSaved });
  const entry: Step = initial === undefined ? "start" : 1;
  const [step, setStep] = useState<Step>(entry);
  const goTo = (next: Step) => {
    editor.clearNotice();
    setStep(next);
  };
  return (
    <form
      className="web-feed-wizard"
      aria-label={TEXT.form}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <WizardHeader step={step} />
      <WizardNotice
        notice={editor.notice}
        {...(step === "cv"
          ? {
              onManual: () => {
                goTo(1);
              },
            }
          : {})}
      />
      <StepContent step={step} editor={editor} profile={profile} onGo={goTo} onFilled={setStep} />
      <WizardFooter
        step={step}
        entry={entry}
        busy={editor.busy}
        canAdvance={!hasInvalidLinks(editor.draft)}
        onGo={goTo}
        onSave={() => void editor.save()}
        onCancel={onCancel}
      />
    </form>
  );
}

type StepContentProps = {
  readonly step: Step;
  readonly editor: ReturnType<typeof useCardEditor>;
  readonly profile: HubProfile | undefined;
  readonly onGo: (step: Step) => void;
  readonly onFilled: (step: Step) => void;
};

function StepContent({ step, editor, profile, onGo, onFilled }: StepContentProps) {
  switch (step) {
    case "start":
      return (
        <StartStep
          onCv={() => {
            onGo("cv");
          }}
          onManual={() => {
            onGo(1);
          }}
        />
      );
    case "cv":
      return (
        <RegistrationFields
          isGenerating={editor.busy === "generating"}
          onGenerate={(sources) => {
            void editor.generate(sources).then((isFilled) => {
              if (isFilled) onFilled(1);
            });
          }}
        />
      );
    case 1:
      return <AboutStep draft={editor.draft} change={editor.change} />;
    case 2:
      return <HelpStep draft={editor.draft} change={editor.change} />;
    case 3:
      return <SeekStep draft={editor.draft} change={editor.change} />;
    case 4:
      return <PreviewStep draft={editor.draft} profile={profile} />;
  }
}

/** The step title takes the focus on every step, so keyboard users land on the new question. */
function WizardHeader({ step }: { readonly step: Step }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  return (
    <div className="web-feed-wizard-header">
      {typeof step === "number" && (
        <>
          <p className="web-feed-wizard-step">{TEXT.step(step, STEP_COUNT)}</p>
          <div className="web-feed-progress" aria-hidden="true">
            {NUMBERED_STEPS.map((done) => (
              <span key={done} className={done <= step ? "is-done" : undefined} />
            ))}
          </div>
        </>
      )}
      <h2 ref={heading} tabIndex={-1}>
        {STEP_TITLES[step]}
      </h2>
    </div>
  );
}

type WizardNoticeProps = {
  readonly notice: EditorNotice | undefined;
  readonly onManual?: () => void;
};

/** What the wizard has to tell; a failed CV reading also offers to continue by hand. */
function WizardNotice({ notice, onManual }: WizardNoticeProps) {
  if (notice === undefined) return null;
  const canFillByHand = notice.tone === "error" && onManual !== undefined;
  return (
    <Notice
      tone={notice.tone}
      title={notice.title}
      {...(notice.detail === undefined ? {} : { detail: notice.detail })}
      {...(canFillByHand ? { actions: <Button onClick={onManual}>{TEXT.cv.manual}</Button> } : {})}
    />
  );
}

type WizardFooterProps = {
  readonly step: Step;
  readonly entry: Step;
  readonly busy: Busy;
  /** False while a link is not a web address, so it is fixed before the preview. */
  readonly canAdvance: boolean;
  readonly onGo: (step: Step) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
};

/**
 * While a request is pending no other step can open, so a late answer never lands elsewhere.
 * Cancelar still closes during a CV reading, whose late answer is then dropped with the wizard,
 * but not during a save, which cannot be undone once sent.
 */
function WizardFooter({ onCancel, ...buttons }: WizardFooterProps) {
  return (
    <footer className="web-feed-wizard-footer">
      <Button variant="ghost" disabled={buttons.busy === "saving"} onClick={onCancel}>
        {TEXT.cancel}
      </Button>
      <span className="web-feed-wizard-spacer" />
      {buttons.step === 4 ? <PreviewButtons {...buttons} /> : <StepButtons {...buttons} />}
    </footer>
  );
}

type StepButtonsProps = Omit<WizardFooterProps, "onCancel">;

function PreviewButtons({ busy, onGo, onSave }: StepButtonsProps) {
  return (
    <>
      <Button
        disabled={busy !== "idle"}
        onClick={() => {
          onGo(3);
        }}
      >
        {TEXT.preview.edit}
      </Button>
      <Button variant="primary" icon="check" loading={busy === "saving"} onClick={onSave}>
        {TEXT.preview.save}
      </Button>
    </>
  );
}

function StepButtons({ step, entry, busy, canAdvance, onGo }: StepButtonsProps) {
  const back = previousStep(step, entry);
  const next = nextStep(step);
  return (
    <>
      {back !== undefined && (
        <Button
          icon="chevron-left"
          disabled={busy !== "idle"}
          onClick={() => {
            onGo(back);
          }}
        >
          {TEXT.back}
        </Button>
      )}
      {next !== undefined && (
        <Button
          variant="primary"
          disabled={!canAdvance}
          onClick={() => {
            onGo(next);
          }}
        >
          {TEXT.next}
        </Button>
      )}
    </>
  );
}

/** Step 1 goes back to where the wizard opened: the start for a new card, nowhere when editing. */
function previousStep(step: Step, entry: Step): Step | undefined {
  if (step === "cv") return "start";
  if (step === "start" || step === entry) return undefined;
  if (step === 1) return "start";
  return NUMBERED_STEPS[NUMBERED_STEPS.indexOf(step) - 1];
}

const nextStep = (step: Step): Step | undefined =>
  typeof step === "number" ? NUMBERED_STEPS[NUMBERED_STEPS.indexOf(step) + 1] : undefined;
