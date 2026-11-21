import type { Result } from "@nodomics/protocol";

export type EpisodeKind = "mcp_call" | "message" | "proposal_decision";

export type Episode = {
  readonly id: string;
  readonly at: string;
  readonly actorId: string;
  readonly kind: EpisodeKind;
  readonly entityIds: readonly string[];
  readonly payload: Readonly<Record<string, unknown>>;
};

export type Entity = {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
};

export type Edge = {
  readonly id: string;
  readonly actorId: string;
  readonly src: string;
  readonly dst: string;
  readonly relation: string;
  readonly validFrom: string;
  readonly validTo: string | null;
};

export type NewEdge = {
  readonly actorId: string;
  readonly src: string;
  readonly dst: string;
  readonly relation: string;
  readonly at: string;
};

export type MemoryErrorCode = "STORE_FAILED" | "NOT_FOUND" | "MALFORMED_ROW";

export type MemoryError = {
  readonly code: MemoryErrorCode;
  readonly message: string;
};

export type MemoryPort = {
  readonly recordEpisode: (episode: Episode) => Promise<Result<void, MemoryError>>;
  readonly upsertEntity: (entity: Entity) => Promise<Result<void, MemoryError>>;
  readonly openEdge: (edge: NewEdge) => Promise<Result<Edge, MemoryError>>;
  readonly closeEdge: (id: string, at: string) => Promise<Result<void, MemoryError>>;
  readonly edgesAt: (
    entityId: string,
    at: string,
    actorId: string,
  ) => Promise<Result<readonly Edge[], MemoryError>>;
  readonly episodesFor: (entityId: string) => Promise<Result<readonly Episode[], MemoryError>>;
};
