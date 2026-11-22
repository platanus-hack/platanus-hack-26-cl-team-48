import { Button, Field, Input } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { CardTextArea } from "./CardTextArea.tsx";
import { PdfInput } from "./PdfInput.tsx";
import { hasSources, type RegistrationSources } from "./extract-card.ts";

const TEXT = MESSAGES.feed.wizard.cv;

type RegistrationFieldsProps = {
  readonly isGenerating: boolean;
  readonly onGenerate: (sources: RegistrationSources) => void;
};

/** "Sube tu CV": the sources the registration agent reads (ADR 0022 §6). */
export function RegistrationFields({ isGenerating, onGenerate }: RegistrationFieldsProps) {
  const [sources, setSources] = useState<RegistrationSources>({
    pdf: undefined,
    text: "",
    githubLogin: "",
  });
  const update = (patch: Partial<RegistrationSources>) => {
    setSources((current) => ({ ...current, ...patch }));
  };
  return (
    <div className="web-feed-step-body">
      <Field label={TEXT.pdf}>
        <PdfInput
          hint={TEXT.pdfHint}
          onChange={(pdf) => {
            update({ pdf });
          }}
        />
      </Field>
      <CardTextArea
        label={TEXT.text}
        value={sources.text}
        onChange={(text) => {
          update({ text });
        }}
      />
      <GithubField
        value={sources.githubLogin}
        onChange={(githubLogin) => {
          update({ githubLogin });
        }}
      />
      {isGenerating && <p className="web-feed-reading">{TEXT.reading}</p>}
      <div className="web-feed-step-cta">
        <Button
          variant="primary"
          size="lg"
          icon="sparkles"
          loading={isGenerating}
          disabled={!hasSources(sources)}
          onClick={() => {
            onGenerate(sources);
          }}
        >
          {TEXT.build}
        </Button>
      </div>
    </div>
  );
}

/** Folded by default: most people don't program, so GitHub is an opt-in extra. */
function GithubField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  if (!isOpen)
    return (
      <div>
        <Button
          variant="ghost"
          icon="code"
          onClick={() => {
            setOpen(true);
          }}
        >
          {TEXT.showGithub}
        </Button>
      </div>
    );
  return (
    <Field label={TEXT.github}>
      <Input value={value} onChange={onChange} />
    </Field>
  );
}
