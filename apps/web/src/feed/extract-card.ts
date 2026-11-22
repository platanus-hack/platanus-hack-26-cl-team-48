import type { ProfileCard, RegistrationRequest } from "@nodomics/profile";
import { feedFailure } from "./feed-errors.ts";
import type { FeedResult, FeedService } from "./feed-service.ts";
import { fileToBase64 } from "./file-to-base64.ts";

/** What the person gave the registration agent to read; blank sources are ignored. */
export type RegistrationSources = {
  readonly pdf: File | undefined;
  readonly text: string;
  readonly githubLogin: string;
};

export const hasSources = ({ pdf, text, githubLogin }: RegistrationSources): boolean =>
  pdf !== undefined || text.trim() !== "" || githubLogin.trim() !== "";

/** Asks the registration agent for a card; a PDF that cannot be read counts as unavailable. */
export async function extractCard(
  feed: FeedService,
  sources: RegistrationSources,
): Promise<FeedResult<ProfileCard>> {
  try {
    return await feed.extractProfile(await requestOf(sources));
  } catch {
    return feedFailure("UNAVAILABLE");
  }
}

async function requestOf({
  pdf,
  text,
  githubLogin,
}: RegistrationSources): Promise<RegistrationRequest> {
  return {
    ...(pdf === undefined ? {} : { pdfBase64: await fileToBase64(pdf) }),
    ...(text.trim() === "" ? {} : { text: text.trim() }),
    ...(githubLogin.trim() === "" ? {} : { githubLogin: githubLogin.trim() }),
  };
}
