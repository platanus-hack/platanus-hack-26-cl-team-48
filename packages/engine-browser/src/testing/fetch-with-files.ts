import { readFile } from "node:fs/promises";

const FILE_PROTOCOL = "file:";

/** Test support: in Node the sample datasets resolve to `file:` URLs, which `fetch` does not read. */
export async function fetchWithFiles(url: string): Promise<Response> {
  return new URL(url).protocol === FILE_PROTOCOL
    ? new Response(await readFile(new URL(url)))
    : fetch(url);
}
