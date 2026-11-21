import type { UserIdentity } from "../mcp/mcp-port.ts";

export type RouteRequest = {
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly identity: UserIdentity;
  readonly rawBody: string;
};

export type RouteReply = { readonly status: number; readonly body: unknown };

export type Route = {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly handle: (request: RouteRequest) => Promise<RouteReply>;
  readonly maxBodyBytes?: number;
};
