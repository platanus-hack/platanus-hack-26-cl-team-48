import { Type, type Static } from "@sinclair/typebox";

/** HTTP paths of the feed in the agent service (ADR 0022 §5). */
export const FEED_PATHS = {
  profile: "/feed/profile",
  card: "/feed/cards/:handle",
  search: "/feed/search",
  matches: "/feed/matches",
  registration: "/feed/registration",
} as const;

export const FeedHitSchema = Type.Object({
  kind: Type.Union([Type.Literal("profile"), Type.Literal("node"), Type.Literal("flow")]),
  /** The handle for a profile, the component id otherwise. */
  id: Type.String(),
  title: Type.String(),
  /** A profile card for a profile, a component card otherwise; each side parses its own kind. */
  payload: Type.Unknown(),
  similarity: Type.Number(),
});
export type FeedHit = Static<typeof FeedHitSchema>;

/** Reply of the search and matches routes. */
export const FeedResultsReplySchema = Type.Object({ results: Type.Array(FeedHitSchema) });
export type FeedResultsReply = Static<typeof FeedResultsReplySchema>;

/** Reply of the profile, card and registration routes; the card is parsed with `parseProfileCard`. */
export const FeedCardReplySchema = Type.Object({ card: Type.Unknown() });
export type FeedCardReply = Static<typeof FeedCardReplySchema>;

export const FeedErrorReplySchema = Type.Object({
  error: Type.String(),
  issues: Type.Optional(Type.Array(Type.Object({ path: Type.String(), message: Type.String() }))),
});
export type FeedErrorReply = Static<typeof FeedErrorReplySchema>;

/** Sources the registration agent reads; at least one must be present. Nothing is stored. */
export const RegistrationRequestSchema = Type.Object(
  {
    pdfBase64: Type.Optional(Type.String({ minLength: 1 })),
    text: Type.Optional(Type.String({ minLength: 1 })),
    githubLogin: Type.Optional(Type.String({ pattern: "^[A-Za-z0-9-]{1,39}$" })),
  },
  { additionalProperties: false },
);
export type RegistrationRequest = Static<typeof RegistrationRequestSchema>;
