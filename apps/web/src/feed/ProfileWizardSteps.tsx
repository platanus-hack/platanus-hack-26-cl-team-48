import type { HubProfile } from "@nodomics/hub";
import { Field, Icon, Input, type IconName } from "@nodomics/ui";
import { Avatar } from "../hub/Avatar.tsx";
import { MESSAGES } from "../messages.ts";
import { CardTextArea } from "./CardTextArea.tsx";
import { cardOfDraft, checkLink, type CardDraft } from "./card-draft.ts";
import { ChipInput } from "./ChipInput.tsx";
import { DomainRows } from "./DomainRows.tsx";
import { CardDetails, CardSummary } from "./ProfileCardView.tsx";
import { TechnicalChoice } from "./TechnicalChoice.tsx";

const TEXT = MESSAGES.feed.wizard;
const LINK_FIELDS = ["linkedin", "github", "website"] as const;

export type DraftStepProps = {
  readonly draft: CardDraft;
  readonly change: (patch: Partial<CardDraft>) => void;
};

/** Step 0: the two ways to start a card. */
export function StartStep({
  onCv,
  onManual,
}: {
  readonly onCv: () => void;
  readonly onManual: () => void;
}) {
  return (
    <div className="web-feed-start">
      <StartChoice icon="sparkles" title={TEXT.start.cv} hint={TEXT.start.cvHint} onClick={onCv} />
      <StartChoice
        icon="type"
        title={TEXT.start.manual}
        hint={TEXT.start.manualHint}
        onClick={onManual}
      />
    </div>
  );
}

type StartChoiceProps = {
  readonly icon: IconName;
  readonly title: string;
  readonly hint: string;
  readonly onClick: () => void;
};

/** A big card button, named by its title and described by its hint. */
function StartChoice({ icon, title, hint, onClick }: StartChoiceProps) {
  return (
    <button type="button" className="web-feed-start-choice" aria-label={title} onClick={onClick}>
      <span className="web-feed-start-icon">
        <Icon name={icon} />
      </span>
      <span className="web-feed-choice-title">{title}</span>
      <span className="web-feed-choice-hint">{hint}</span>
    </button>
  );
}

/** Step 1: who the person is and how they use Nodomics. */
export function AboutStep({ draft, change }: DraftStepProps) {
  return (
    <div className="web-feed-step-body">
      <CardTextArea
        label={TEXT.about.about}
        placeholder={TEXT.about.aboutPlaceholder}
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
    </div>
  );
}

/** Step 2: what the person can help with and the topics they know. */
export function HelpStep({ draft, change }: DraftStepProps) {
  return (
    <div className="web-feed-step-body">
      <ChipInput
        label={TEXT.help.offers}
        help={TEXT.help.offersHint}
        values={draft.offers}
        onChange={(offers) => {
          change({ offers });
        }}
      />
      <DomainRows
        domains={draft.domains}
        onChange={(domains) => {
          change({ domains });
        }}
      />
    </div>
  );
}

/** Step 3: what the person is looking for and where to find them. */
export function SeekStep({ draft, change }: DraftStepProps) {
  return (
    <div className="web-feed-step-body">
      <ChipInput
        label={TEXT.seek.seeks}
        help={TEXT.seek.seeksHint}
        values={draft.seeks}
        onChange={(seeks) => {
          change({ seeks });
        }}
      />
      <fieldset className="web-feed-links-fields">
        <legend>{TEXT.seek.links}</legend>
        {LINK_FIELDS.map((key) => (
          <Field
            key={key}
            label={TEXT.seek[key]}
            {...(checkLink(draft[key]).kind === "invalid" ? { error: TEXT.seek.invalidLink } : {})}
          >
            <Input
              icon="globe"
              value={draft[key]}
              onChange={(url) => {
                change({ [key]: url });
              }}
            />
          </Field>
        ))}
      </fieldset>
    </div>
  );
}

/** Step 4: the card exactly as visitors will see it. */
export function PreviewStep({
  draft,
  profile,
}: {
  readonly draft: CardDraft;
  readonly profile: HubProfile | undefined;
}) {
  const card = cardOfDraft(draft);
  return (
    <div className="web-feed-preview">
      {profile !== undefined && (
        <div className="web-feed-preview-who">
          <Avatar name={profile.displayName} url={profile.avatarUrl} size="md" />
          <div>
            <p className="web-feed-preview-name">{profile.displayName}</p>
            <p className="web-hub-muted">{`@${profile.handle}`}</p>
          </div>
        </div>
      )}
      <CardSummary card={card} />
      <CardDetails card={card} />
    </div>
  );
}
