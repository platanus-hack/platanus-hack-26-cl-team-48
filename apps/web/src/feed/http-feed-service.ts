import {
  FEED_PATHS,
  FeedCardReplySchema,
  FeedErrorReplySchema,
  FeedMapReplySchema,
  FeedResultsReplySchema,
  parseProfileCard,
  type FeedHit,
  type ProfileCard,
} from "@nodomics/profile";
import { ok, parse } from "@nodomics/protocol";
import { feedFailure } from "./feed-errors.ts";
import type { FeedErrorCode, FeedResult, FeedService } from "./feed-service.ts";

export type HttpFeedDeps = {
  readonly baseUrl: string;
  readonly getAccessToken: () => Promise<string | undefined>;
  readonly fetch: typeof fetch;
};

type Request = {
  readonly path: string;
  readonly method?: "POST";
  readonly body?: unknown;
};

const UNAUTHORIZED = 401;
const CODES_BY_ERROR: Readonly<Record<string, FeedErrorCode>> = {
  no_profile: "NO_PROFILE",
  invalid_card: "INVALID_CARD",
  extraction_failed: "EXTRACTION_FAILED",
};

/** The Feed through the HTTP routes of the agent service (ADR 0022 §5). */
export function createHttpFeedService(deps: HttpFeedDeps): FeedService {
  const send = createSender(deps);
  return {
    mapPeople: async (text) => {
      const reply = await send({ path: `${FEED_PATHS.map}?q=${encodeURIComponent(text)}` });
      if (!reply.ok) return reply;
      const parsed = parse(FeedMapReplySchema, reply.value);
      return parsed.ok ? ok(parsed.value.people) : feedFailure("UNAVAILABLE");
    },
    search: async (text) =>
      hitsOf(await send({ path: `${FEED_PATHS.search}?q=${encodeURIComponent(text)}` })),
    matches: async () => hitsOf(await send({ path: FEED_PATHS.matches })),
    card: async (handle) => {
      const reply = await send({
        path: FEED_PATHS.card.replace(":handle", encodeURIComponent(handle)),
      });
      if (!reply.ok && reply.error.code === "NO_PROFILE") return ok(undefined);
      return cardOf(reply);
    },
    saveProfile: async (card) =>
      cardOf(await send({ path: FEED_PATHS.profile, method: "POST", body: { card } })),
    extractProfile: async (request) =>
      cardOf(await send({ path: FEED_PATHS.registration, method: "POST", body: request })),
  };
}

/** Sends a request with the user's token and returns the JSON of a successful reply. */
function createSender({ baseUrl, getAccessToken, fetch }: HttpFeedDeps) {
  const root = baseUrl.replace(/\/+$/, "");
  return async ({ path, method, body }: Request): Promise<FeedResult<unknown>> => {
    const token = await getAccessToken();
    if (token === undefined) return feedFailure("UNAUTHENTICATED");
    try {
      const response = await fetch(`${root}${path}`, {
        method: method ?? "GET",
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const json = await readJson(response);
      return response.ok ? ok(json) : failureOf(response.status, json);
    } catch {
      return feedFailure("UNAVAILABLE");
    }
  };
}

const readJson = (response: Response): Promise<unknown> => response.json().catch(() => undefined);

function failureOf(status: number, json: unknown) {
  if (status === UNAUTHORIZED) return feedFailure("UNAUTHENTICATED");
  const reply = parse(FeedErrorReplySchema, json);
  if (!reply.ok) return feedFailure("UNAVAILABLE");
  return feedFailure(CODES_BY_ERROR[reply.value.error] ?? "UNAVAILABLE", reply.value.issues);
}

function hitsOf(reply: FeedResult<unknown>): FeedResult<FeedHit[]> {
  if (!reply.ok) return reply;
  const parsed = parse(FeedResultsReplySchema, reply.value);
  return parsed.ok ? ok(parsed.value.results) : feedFailure("UNAVAILABLE");
}

function cardOf(reply: FeedResult<unknown>): FeedResult<ProfileCard> {
  if (!reply.ok) return reply;
  const parsed = parse(FeedCardReplySchema, reply.value);
  if (!parsed.ok) return feedFailure("UNAVAILABLE");
  const card = parseProfileCard(parsed.value.card);
  return card.ok ? card : feedFailure("UNAVAILABLE");
}
