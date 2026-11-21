import type { Flow, NodeManifest, Result } from "@nodomics/protocol";
import type { Snapshot } from "./snapshot.ts";

export type PublicationKind = "flow" | "node";
export type OAuthProvider = "github" | "google";

export type SignInMethod =
  | { readonly kind: "provider"; readonly provider: OAuthProvider }
  | { readonly kind: "email"; readonly email: string };

export type HubProfile = {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
};

export type PublicationSummary = {
  readonly id: string;
  readonly slug: string;
  readonly kind: PublicationKind;
  readonly title: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
  readonly license: string;
  readonly latestVersion?: string;
  readonly updatedAt: string;
  readonly owner: Omit<HubProfile, "id">;
};

export type VersionSummary = {
  readonly version: string;
  readonly createdAt: string;
  readonly hasState: boolean;
};

export type PublicationDetail = PublicationSummary & {
  readonly versions: ReadonlyArray<VersionSummary>;
};

export type PublishedVersion = {
  readonly version: string;
  readonly createdAt: string;
  readonly flow: Flow;
  readonly manifest?: NodeManifest;
  readonly snapshot?: Snapshot;
};

/** What the author sends to publish a new version; the publication is created on first use. */
export type PublicationDraft = {
  readonly slug: string;
  readonly kind: PublicationKind;
  readonly title: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
  readonly version: string;
  readonly flow: Flow;
  readonly manifest?: NodeManifest;
  readonly snapshot: Snapshot;
};

export type SearchQuery = { readonly text?: string; readonly kind?: PublicationKind };

export type HubErrorKind =
  "signed-out" | "stale-version" | "kind-mismatch" | "too-large" | "invalid" | "unavailable";

/** Expected failures are values (CLAUDE.md §3); `detail` is for logs, not for users. */
export type HubError = { readonly kind: HubErrorKind; readonly detail?: string };

export type HubResult<T> = Result<T, HubError>;

/** The hub of flows and nodes (ADR 0018). The interface only talks to it through this port. */
export interface Hub {
  currentProfile(): Promise<HubProfile | undefined>;
  onProfileChange(listener: (profile: HubProfile | undefined) => void): () => void;
  signIn(method: SignInMethod): Promise<HubResult<void>>;
  signOut(): Promise<void>;
  profile(handle: string): Promise<HubResult<HubProfile | undefined>>;
  search(query: SearchQuery): Promise<HubResult<ReadonlyArray<PublicationSummary>>>;
  publicationsOf(handle: string): Promise<HubResult<ReadonlyArray<PublicationSummary>>>;
  publication(handle: string, slug: string): Promise<HubResult<PublicationDetail | undefined>>;
  version(publicationId: string, version: string): Promise<HubResult<PublishedVersion>>;
  /** Mine, by slug: to know whether publishing creates a publication or adds a version. */
  ownPublication(slug: string): Promise<HubResult<PublicationSummary | undefined>>;
  publish(draft: PublicationDraft): Promise<HubResult<PublicationSummary>>;
}
