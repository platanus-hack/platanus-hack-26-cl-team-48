import type { Flow, Result } from "@nodomics/protocol";
import type { StoreError } from "./stores.ts";
export type NodeRun = {
  readonly nodeId: string;
  readonly status: "ok" | "error" | "skipped";
  readonly error: string | null;
};
export type Sample = {
  readonly schema: { readonly columns: readonly { name: string; type: string }[] };
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly page: number;
  readonly hasMore: boolean;
};
export interface Runner {
  run(
    flow: Flow,
    upTo?: readonly string[],
  ): Promise<Result<{ readonly nodes: readonly NodeRun[] }, StoreError>>;
  sample(
    flow: Flow,
    request: { nodeId: string; port: string; page: number },
  ): Promise<Result<Sample, StoreError>>;
  logs(
    flow: Flow,
    nodeId: string,
  ): Promise<Result<{ readonly nodeId: string; readonly lines: readonly string[] }, StoreError>>;
}
