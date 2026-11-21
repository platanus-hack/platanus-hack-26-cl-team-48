const FIRST_VERSION = "0.1.0";

const numbersOf = (version: string): ReadonlyArray<number> =>
  (version.split("-")[0] ?? "").split(".").map(Number);

/** Semver order on major.minor.patch, as the database checks it (ADR 0018). */
export function isNewerVersion(candidate: string, latest: string | undefined): boolean {
  if (latest === undefined) return true;
  const [left, right] = [numbersOf(candidate), numbersOf(latest)];
  const index = left.findIndex((part, at) => part !== right[at]);
  return index !== -1 && (left[index] ?? 0) > (right[index] ?? 0);
}

export function nextPatchVersion(latest: string | undefined): string {
  if (latest === undefined) return FIRST_VERSION;
  const [major = 0, minor = 1, patch = 0] = numbersOf(latest);
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
}
