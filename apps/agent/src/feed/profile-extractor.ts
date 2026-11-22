import type { RegistrationImage } from "@nodomics/profile";
import type { Result } from "@nodomics/protocol";

/** What the registration agent reads. Nothing here is ever stored or logged. */
export type ExtractionSource = {
  readonly pdfBase64?: string;
  readonly text?: string;
  readonly githubSummary?: string;
  readonly images?: readonly RegistrationImage[];
  readonly lookupSummary?: string;
};

export type ExtractError = {
  readonly code: "UPSTREAM" | "REFUSED" | "MALFORMED";
  readonly message: string;
};

export interface ProfileExtractorPort {
  /** Proposes a card; the value is untrusted until the caller parses it with `parseProfileCard`. */
  extract(source: ExtractionSource): Promise<Result<unknown, ExtractError>>;
}
