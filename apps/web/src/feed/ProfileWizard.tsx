import type { HubProfile } from "@nodomics/hub";
import type { ProfileCard } from "@nodomics/profile";
import { Button, Notice } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import type { FeedService } from "./feed-service.ts";
import { RegistrationFields } from "./RegistrationFields.tsx";
import { AboutStep, HelpStep, PreviewStep, SeekStep, StartStep } from "./ProfileWizardSteps.tsx";
import { useCardEditor, type EditorNotice } from "./use-card-editor.ts";

type NumberedStep = 1 | 2 | 3 | 4;
type Step = "start" | "cv" | NumberedStep;

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
  const [step, setStep] = useState<Step>(initial === undefined ? "start" : 1);
  const goTo = (next: Step) => {
    editor.clearNotice();
    setStep(next);
  };
  const startManually = () => {
    editor.startEmpty();
    setStep(1);
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
      <WizardNotice notice={editor.notice} onManual={step === "cv" ? startManually : undefined} />
      {step === "start" && (
        <StartStep
          onCv={() => {
            goTo("cv");
          }}
          onManual={startManually}
        />
      )}
      {step === "cv" && (
        <RegistrationFields
          isGenerating={editor.busy === "generating"}
          onGenerate={(sources) => {
            void editor.generate(sources).then((isFilled) => {
              if (isFilled) setStep(1);
            });
          }}
        />
      )}
      {step === 1 && <AboutStep draft={editor.draft} change={editor.change} />}
      {step === 2 && <HelpStep draft={editor.draft} change={editor.change} />}
      {step === 3 && <SeekStep draft={editor.draft} change={editor.change} />}
      {step === 4 && <PreviewStep draft={editor.draft} profile={profile} />}
      <WizardFooter
        step={step}
        isNew={initial === undefined}
        isSaving={editor.busy === "saving"}
        onGo={goTo}
        onSave={() => void editor.save()}
        onCancel={onCancel}
      />
    </form>
  );
}

function WizardHeader({ step }: { readonly step: Step }) {
  return (
    <header className="web-feed-wizard-header">
      {typeof step === "number" && (
        <>
          <p className="web-feed-wizard-step">{TEXT.step(step, STEP_COUNT)}</p>
          <div className="web-feed-progress" aria-hidden="true">
            {Array.from({ length: STEP_COUNT }, (_, index) => (
              <span key={index} className={index < step ? "is-done" : undefined} />
            ))}
          </div>
        </>
      )}
      <h2>{STEP_TITLES[step]}</h2>
    </header>
  );
}

type WizardNoticeProps = {
  readonly notice: EditorNotice | undefined;
  readonly onManual: (() => void) | undefined;
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
  readonly isNew: boolean;
  readonly isSaving: boolean;
  readonly onGo: (step: Step) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
};

function WizardFooter({ step, isNew, isSaving, onGo, onSave, onCancel }: WizardFooterProps) {
  return (
    <footer className="web-feed-wizard-footer">
      <Button variant="ghost" onClick={onCancel}>
        {TEXT.cancel}
      </Button>
      <span className="web-feed-wizard-spacer" />
      <StepButtons step={step} isNew={isNew} isSaving={isSaving} onGo={onGo} onSave={onSave} />
    </footer>
  );
}

function StepButtons({ step, isNew, isSaving, onGo, onSave }: Omit<WizardFooterProps, "onCancel">) {
  const back = previousStep(step, isNew);
  if (step === 4)
    return (
      <>
        <Button
          onClick={() => {
            onGo(3);
          }}
        >
          {TEXT.preview.edit}
        </Button>
        <Button variant="primary" icon="check" loading={isSaving} onClick={onSave}>
          {TEXT.preview.save}
        </Button>
      </>
    );
  return (
    <>
      {back !== undefined && (
        <Button
          icon="chevron-left"
          onClick={() => {
            onGo(back);
          }}
        >
          {TEXT.back}
        </Button>
      )}
      {typeof step === "number" && (
        <Button
          variant="primary"
          onClick={() => {
            onGo(nextStep(step));
          }}
        >
          {TEXT.next}
        </Button>
      )}
    </>
  );
}

function previousStep(step: Step, isNew: boolean): Step | undefined {
  if (step === "cv") return "start";
  if (step === "start") return undefined;
  if (step === 1) return isNew ? "start" : undefined;
  return NUMBERED_STEPS[NUMBERED_STEPS.indexOf(step) - 1];
}

const nextStep = (step: NumberedStep): NumberedStep =>
  NUMBERED_STEPS[NUMBERED_STEPS.indexOf(step) + 1] ?? step;
