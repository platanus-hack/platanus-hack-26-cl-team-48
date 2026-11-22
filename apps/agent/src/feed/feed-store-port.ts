import type { FeedHit, FeedMapPerson, ProfileCard } from "@nodomics/profile";
import type { Result } from "@nodomics/protocol";

export type FeedStoreError = { readonly code: "STORE_ERROR"; readonly message: string };

export type StoredProfileCard = {
  readonly profileId: string;
  readonly card: ProfileCard;
  readonly offersEmbedding: readonly number[];
  /** Absent when the card has no seeks. */
  readonly seeksEmbedding: readonly number[] | undefined;
  readonly contentHash: string;
  readonly embeddingModel: string;
};

export interface FeedStorePort {
  mapProfiles(
    model: string,
    handles?: readonly string[],
  ): Promise<Result<Omit<FeedMapPerson, "match">[], FeedStoreError>>;
  getOwnCard(profileId: string): Promise<Result<StoredProfileCard | undefined, FeedStoreError>>;
  getCardByHandle(handle: string): Promise<Result<ProfileCard | undefined, FeedStoreError>>;
  upsertCard(row: StoredProfileCard): Promise<Result<void, FeedStoreError>>;
  match(
    query: readonly number[],
    k: number,
    excludeProfileId?: string,
  ): Promise<Result<FeedHit[], FeedStoreError>>;
}
