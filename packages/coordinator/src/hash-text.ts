// Two seeds of a 53-bit hash give ~106 bits: enough to make accidental cache key collisions
// negligible, while staying synchronous and free of platform crypto APIs.
const SEEDS = [0x9e3779b9, 0x85ebca6b] as const;
const HEX_DIGITS_PER_HASH = 14;

export const hashText = (text: string): string =>
  SEEDS.map((seed) => cyrb53(text, seed).toString(16).padStart(HEX_DIGITS_PER_HASH, "0")).join("");

// cyrb53 (public domain, by bryc); the numeric constants are part of the algorithm.
function cyrb53(text: string, seed: number): number {
  const state = { h1: 0xdeadbeef ^ seed, h2: 0x41c6ce57 ^ seed };
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    state.h1 = Math.imul(state.h1 ^ code, 2654435761);
    state.h2 = Math.imul(state.h2 ^ code, 1597334677);
  }
  const h1 =
    Math.imul(state.h1 ^ (state.h1 >>> 16), 2246822507) ^
    Math.imul(state.h2 ^ (state.h2 >>> 13), 3266489909);
  const h2 =
    Math.imul(state.h2 ^ (state.h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
