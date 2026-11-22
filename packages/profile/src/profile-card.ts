import { Type, type TSchema } from "@sinclair/typebox";

export const CURRENT_PROFILE_SCHEMA_VERSION = 1;

export const MAX_ABOUT_LENGTH = 1000;
export const MAX_DOMAINS = 10;
export const MAX_DOMAIN_NAME_LENGTH = 80;
export const MAX_LIST_ENTRIES = 10;
export const MAX_LIST_ENTRY_LENGTH = 200;
export const MAX_LINK_LENGTH = 300;

const HAS_NON_SPACE_PATTERN = String.raw`\S`;
const HTTPS_PATTERN = "^https://";

export type TechnicalLevel = "uses" | "builds" | "codes";
export type DomainDepth = "curious" | "practitioner" | "expert";
export type ProfileDomain = { readonly name: string; readonly depth: DomainDepth };
export type ProfileLinks = {
  readonly linkedin?: string;
  readonly github?: string;
  readonly website?: string;
};
export type ProfileCard = {
  readonly schemaVersion: 1;
  readonly about: string;
  readonly technical: TechnicalLevel;
  readonly domains: readonly ProfileDomain[];
  readonly offers: readonly string[];
  readonly seeks: readonly string[];
  readonly links: ProfileLinks;
};

const text = (maxLength: number): TSchema =>
  Type.String({ minLength: 1, maxLength, pattern: HAS_NON_SPACE_PATTERN });

const link = (): TSchema => Type.String({ maxLength: MAX_LINK_LENGTH, pattern: HTTPS_PATTERN });

const textList = (): TSchema =>
  Type.Array(text(MAX_LIST_ENTRY_LENGTH), { maxItems: MAX_LIST_ENTRIES });

const closed = { additionalProperties: false } as const;

const DomainSchema = Type.Object(
  {
    name: text(MAX_DOMAIN_NAME_LENGTH),
    depth: Type.Union([
      Type.Literal("curious"),
      Type.Literal("practitioner"),
      Type.Literal("expert"),
    ]),
  },
  closed,
);

const LinksSchema = Type.Object(
  {
    linkedin: Type.Optional(link()),
    github: Type.Optional(link()),
    website: Type.Optional(link()),
  },
  closed,
);

/** TypeBox schema of the current profile card version (ADR 0022 §1). */
export const ProfileCardSchema: TSchema = Type.Object(
  {
    schemaVersion: Type.Literal(CURRENT_PROFILE_SCHEMA_VERSION),
    about: text(MAX_ABOUT_LENGTH),
    technical: Type.Union([Type.Literal("uses"), Type.Literal("builds"), Type.Literal("codes")]),
    domains: Type.Array(DomainSchema, { maxItems: MAX_DOMAINS }),
    offers: textList(),
    seeks: textList(),
    links: LinksSchema,
  },
  closed,
);
