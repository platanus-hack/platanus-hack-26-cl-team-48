const MAX_ID_LENGTH = 64;
const SUFFIX_ROOM = 8;

/** `base` if nobody uses it yet, otherwise `base-2`, `base-3`… */
export function createUniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  const next = (suffix: number): string =>
    taken.has(`${base}-${String(suffix)}`) ? next(suffix + 1) : `${base}-${String(suffix)}`;
  return next(2);
}

/** `count` distinct ids, none of them in `taken`. */
export function createUniqueIds(
  base: string,
  count: number,
  taken: ReadonlySet<string>,
): ReadonlyArray<string> {
  return Array.from({ length: count }).reduce<string[]>(
    (ids) => [...ids, createUniqueId(base, new Set([...taken, ...ids]))],
    [],
  );
}

/** A protocol-safe id fragment from free text: «Filtrar y agrupar» → `filtrar-y-agrupar`. */
export function slugify(text: string, fallback: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_ID_LENGTH - SUFFIX_ROOM);
  return slug === "" ? fallback : slug;
}
