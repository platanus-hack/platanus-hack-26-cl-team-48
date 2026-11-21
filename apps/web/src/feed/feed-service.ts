import type { FeedHit, ProfileCard, RegistrationRequest } from "@nodomics/profile";
import type { Result, ValidationIssue } from "@nodomics/protocol";

export type FeedErrorCode =
  "UNAUTHENTICATED" | "UNAVAILABLE" | "NO_PROFILE" | "INVALID_CARD" | "EXTRACTION_FAILED";

export type FeedError = {
  readonly code: FeedErrorCode;
  readonly issues?: ReadonlyArray<ValidationIssue>;
};

export type FeedResult<T> = Result<T, FeedError>;

/** What the web app asks of the Feed (ADR 0022); the agent service or an in-memory copy answers. */
export type FeedService = {
  readonly search: (text: string) => Promise<FeedResult<FeedHit[]>>;
  readonly matches: () => Promise<FeedResult<FeedHit[]>>;
  /** The collaboration card of a handle; `undefined` when the person has none yet. */
  readonly card: (handle: string) => Promise<FeedResult<ProfileCard | undefined>>;
  readonly saveProfile: (card: ProfileCard) => Promise<FeedResult<ProfileCard>>;
  /** Reads a CV or a GitHub account into a card to review; nothing is stored. */
  readonly extractProfile: (request: RegistrationRequest) => Promise<FeedResult<ProfileCard>>;
};
