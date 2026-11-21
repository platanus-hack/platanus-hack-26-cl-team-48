const PRE_RELEASE_MAJOR = "0";

/** While the major version is 0, a minor bump may break the protocol, so both must match. */
export const isCompatibleProtocol = (expected: string, received: string) =>
  compatibilityKeyOf(expected) === compatibilityKeyOf(received);

function compatibilityKeyOf(version: string): string {
  const [major, minor] = version.split(".");
  return major === PRE_RELEASE_MAJOR ? `${major}.${minor ?? ""}` : (major ?? "");
}
