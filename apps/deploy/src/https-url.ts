const HTTPS = "https:";

/** The web turns a deployment URL into a link, so any other scheme (javascript:, http:) is dropped. */
export function isHttpsUrl(url: string | undefined): url is string {
  try {
    return url !== undefined && new URL(url).protocol === HTTPS;
  } catch {
    return false;
  }
}
