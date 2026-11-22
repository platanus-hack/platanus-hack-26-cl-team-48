import type { LlmPort } from "../../llm/llm-port.ts";
import type { MemoryPort } from "../../memory/memory-port.ts";
import { explainWhy } from "../../memory/story.ts";
import type { Route, RouteReply, RouteRequest } from "../route.ts";

export type WhyRouteDeps = { readonly memory: MemoryPort; readonly llm: LlmPort };

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_GATEWAY = 502;
const MAX_QUESTION_LENGTH = 500;

const errorReply = (status: number, error: string): RouteReply => ({ status, body: { error } });

const isValidQuestion = (q: string | undefined): q is string =>
  q !== undefined && q.trim().length > 0 && q.length <= MAX_QUESTION_LENGTH;

async function answer(
  deps: WhyRouteDeps,
  request: RouteRequest,
  question: string,
): Promise<RouteReply> {
  const story = await explainWhy(deps, {
    actorId: request.identity.userId,
    componentId: request.params["id"] ?? "",
    question,
  });
  if (!story.ok) return errorReply(HTTP_BAD_GATEWAY, "upstream_unavailable");
  if (!story.value.hasHistory) return errorReply(HTTP_NOT_FOUND, "not_found");
  const { answer: text, citations } = story.value;
  return { status: HTTP_OK, body: { answer: text, citations } };
}

export function createWhyRoute(deps: WhyRouteDeps): Route {
  return {
    method: "GET",
    path: "/agent/components/:id/why",
    handle: (request) => {
      const question = request.query["q"];
      return isValidQuestion(question)
        ? answer(deps, request, question)
        : Promise.resolve(errorReply(HTTP_BAD_REQUEST, "invalid_query"));
    },
  };
}
