import type { ProfileCard } from "@nodomics/profile";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { cardOfDraft, draftOfCard, EMPTY_DRAFT, type CardDraft } from "./card-draft.ts";
import { extractCard, type RegistrationSources } from "./extract-card.ts";
import type { FeedError, FeedService } from "./feed-service.ts";

export type EditorNotice = {
  readonly tone: "error" | "ai";
  readonly title: string;
  readonly detail?: string;
};

type Busy = "idle" | "saving" | "generating";

type EditorDeps = {
  readonly feed: FeedService;
  readonly initial: ProfileCard | undefined;
  readonly onSaved: (card: ProfileCard) => void;
};

const TEXT = MESSAGES.feed.wizard;
const REVIEW_NOTICE: EditorNotice = { tone: "ai", title: TEXT.cv.review };
const GENERATE_FAILED_NOTICE: EditorNotice = { tone: "error", title: TEXT.cv.failed };

function saveFailedNotice({ code, issues }: FeedError): EditorNotice {
  if (code !== "INVALID_CARD") return { tone: "error", title: TEXT.saveFailed };
  return {
    tone: "error",
    title: TEXT.invalid,
    ...(issues === undefined
      ? {}
      : { detail: issues.map(({ path, message }) => `${path}: ${message}`).join("\n") }),
  };
}

/** The state of the collaboration card wizard: the draft, what is running and what to tell. */
export function useCardEditor({ feed, initial, onSaved }: EditorDeps) {
  const [draft, setDraft] = useState<CardDraft>(draftOfCard(initial));
  const [notice, setNotice] = useState<EditorNotice | undefined>(undefined);
  const [busy, setBusy] = useState<Busy>("idle");

  const change = (patch: Partial<CardDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const startEmpty = () => {
    setDraft(EMPTY_DRAFT);
    setNotice(undefined);
  };

  const save = async () => {
    setBusy("saving");
    const saved = await feed.saveProfile(cardOfDraft(draft));
    setBusy("idle");
    if (saved.ok) onSaved(saved.value);
    else setNotice(saveFailedNotice(saved.error));
  };

  /** Fills the draft from the registration agent; tells whether it worked. */
  const generate = async (sources: RegistrationSources): Promise<boolean> => {
    setBusy("generating");
    setNotice(undefined);
    const extracted = await extractCard(feed, sources);
    setBusy("idle");
    if (extracted.ok) setDraft(draftOfCard(extracted.value));
    setNotice(extracted.ok ? REVIEW_NOTICE : GENERATE_FAILED_NOTICE);
    return extracted.ok;
  };

  const clearNotice = () => {
    setNotice(undefined);
  };

  return { draft, notice, busy, change, startEmpty, save, generate, clearNotice };
}
