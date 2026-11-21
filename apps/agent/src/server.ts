import { createServer as createHttpServer, type Server } from "node:http";

export type ServerDeps = Readonly<Record<string, never>>;

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

export function createServer(deps: ServerDeps): Server {
  return createHttpServer(deps, (request, response) => {
    const isHealthRequest = request.method === "GET" && request.url?.split("?", 1)[0] === "/health";
    response.statusCode = isHealthRequest ? HTTP_OK : HTTP_NOT_FOUND;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(isHealthRequest ? { status: "ok" } : { error: "not_found" }));
  });
}
