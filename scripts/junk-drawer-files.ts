const JUNK_DRAWER_NAME = /(^|\/|-)(utils?|helpers?|common|misc|manager)\.(ts|tsx|py)$/;

/** Returns the paths whose file name hides a module without a single responsibility. */
export function findJunkDrawerFiles(paths: readonly string[]): string[] {
  return paths.filter((path) => JUNK_DRAWER_NAME.test(path));
}
