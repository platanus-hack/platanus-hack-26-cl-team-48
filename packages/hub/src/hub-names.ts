const MAX_SLUG_LENGTH = 30;
const FALLBACK_SLUG = "flujo";
const SLUG_PATTERN = /^[a-z0-9-]{1,30}$/u;
const HUB_NODE_PREFIX = "hub.";

/** A URL-safe name for a publication, made from its title (ADR 0018). */
export function slugOf(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/gu, "");
  return slug === "" ? FALLBACK_SLUG : slug;
}

export const isValidSlug = (slug: string): boolean => SLUG_PATTERN.test(slug);

/** Published nodes never collide with `mine.*` nodes or with another author's node. */
export const hubNodeId = (handle: string, slug: string): string =>
  `${HUB_NODE_PREFIX}${handle}.${slug}`;
