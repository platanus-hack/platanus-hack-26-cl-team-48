import type { JsonRpcMessage } from "./messages.ts";

/** Port: moves JSON-RPC messages between two peers. Adapters decide how they travel. */
export interface Transport {
  send(message: JsonRpcMessage): void;
  onMessage(handler: (message: unknown) => void): () => void;
  close(): void;
}
