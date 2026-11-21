import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  activeAnnouncements,
  formatAnnouncements,
  isAnnouncementFile,
  parseAnnouncement,
  pendingAnnouncements,
  type Announcement,
  type InvalidAnnouncement,
} from "./announcements.ts";

// Only what reached origin/main counts, so every agent sees the same announcements
// whatever branch or worktree it is on (CLAUDE.md, "Anuncios").
const SOURCE = "origin/main";
const FOLDER = "docs/anuncios";
const STATE_FILE = "nodomics-anuncios.json";
const FETCH_EVERY_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
// A fetch must never wait for a password: the hook runs on every prompt, unattended.
const NON_INTERACTIVE = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

type State = { readonly read: ReadonlyArray<string>; readonly fetchedAt: number };

const isShowingAll = process.argv.includes("--todos");
const isHook = process.argv.includes("--hook");

try {
  showAnnouncements();
} catch (error) {
  // In a hook a failure must not get in the way of the agent's prompt.
  if (!isHook) throw error;
}

function showAnnouncements(): void {
  const statePath = git(["rev-parse", "--git-path", STATE_FILE]).trim();
  const state = readState(statePath);
  const fetchedAt = refreshSource(state.fetchedAt);
  const read = new Set(state.read);
  const { announcements, invalid } = readAnnouncements();
  const shown = isShowingAll
    ? activeAnnouncements({ announcements, today: today() })
    : pendingAnnouncements({ announcements, read, today: today() });
  const shownInvalid = isShowingAll ? invalid : invalid.filter(({ file }) => !read.has(file));
  process.stdout.write(formatAnnouncements(shown, shownInvalid) || emptyMessage());
  writeState(statePath, {
    read: [...new Set([...read, ...[...shown, ...shownInvalid].map(({ file }) => file)])],
    fetchedAt,
  });
}

function git(args: ReadonlyArray<string>, timeout?: number): string {
  const result = spawnSync("git", args, { encoding: "utf8", timeout, env: NON_INTERACTIVE });
  return result.status === 0 ? result.stdout : "";
}

function refreshSource(lastFetch: number): number {
  if (Date.now() - lastFetch < FETCH_EVERY_MS) return lastFetch;
  git(["fetch", "--quiet", "origin", "main"], FETCH_TIMEOUT_MS);
  return Date.now();
}

function readAnnouncements(): {
  announcements: Announcement[];
  invalid: InvalidAnnouncement[];
} {
  const parsed = announcementFiles().map((file) => ({
    file,
    result: parseAnnouncement(file, git(["show", `${SOURCE}:${FOLDER}/${file}`])),
  }));
  return {
    announcements: parsed.flatMap(({ result }) => (result.ok ? [result.value] : [])),
    invalid: parsed.flatMap(({ file, result }) =>
      result.ok ? [] : [{ file, error: result.error }],
    ),
  };
}

function announcementFiles(): string[] {
  return git(["ls-tree", "--name-only", `${SOURCE}:${FOLDER}`])
    .split("\n")
    .filter(isAnnouncementFile);
}

function readState(path: string): State {
  const empty: State = { read: [], fetchedAt: 0 };
  if (path === "" || !existsSync(path)) return empty;
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isState(value) ? value : empty;
  } catch {
    return empty;
  }
}

function isState(value: unknown): value is State {
  return (
    typeof value === "object" &&
    value !== null &&
    "read" in value &&
    Array.isArray(value.read) &&
    value.read.every((file) => typeof file === "string") &&
    "fetchedAt" in value &&
    typeof value.fetchedAt === "number"
  );
}

function writeState(path: string, next: State): void {
  try {
    if (path !== "") writeFileSync(path, JSON.stringify(next));
  } catch {
    // A sandbox with a read-only .git (Codex) only loses the memory of what it already saw.
  }
}

function emptyMessage(): string {
  return isHook ? "" : "No hay anuncios nuevos.\n";
}

function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}
