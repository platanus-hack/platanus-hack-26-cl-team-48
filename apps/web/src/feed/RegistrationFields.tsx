import { Button, Field, Input } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { CardTextArea } from "./CardTextArea.tsx";
import { PdfInput } from "./PdfInput.tsx";
import { hasSources, type RegistrationSources } from "./extract-card.ts";

type RegistrationFieldsProps = {
  readonly isBusy: boolean;
  readonly onGenerate: (sources: RegistrationSources) => void;
};

/** "Generar desde mi CV": the sources the registration agent reads (ADR 0022 §6). */
export function RegistrationFields({ isBusy, onGenerate }: RegistrationFieldsProps) {
  const [sources, setSources] = useState<RegistrationSources>({
    pdf: undefined,
    text: "",
    githubLogin: "",
  });
  return (
    <fieldset className="web-feed-registration">
      <legend>{MESSAGES.feed.registration.title}</legend>
      <Field label={MESSAGES.feed.registration.pdf}>
        <PdfInput
          onChange={(pdf) => {
            setSources({ ...sources, pdf });
          }}
        />
      </Field>
      <CardTextArea
        label={MESSAGES.feed.registration.text}
        value={sources.text}
        onChange={(text) => {
          setSources({ ...sources, text });
        }}
      />
      <Field label={MESSAGES.feed.registration.github}>
        <Input
          value={sources.githubLogin}
          onChange={(githubLogin) => {
            setSources({ ...sources, githubLogin });
          }}
        />
      </Field>
      <Button
        icon="sparkles"
        loading={isBusy}
        disabled={!hasSources(sources)}
        onClick={() => {
          onGenerate(sources);
        }}
      >
        {MESSAGES.feed.registration.generate}
      </Button>
    </fieldset>
  );
}
