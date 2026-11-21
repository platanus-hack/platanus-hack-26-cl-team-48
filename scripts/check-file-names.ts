import { execFileSync } from "node:child_process";
import { findJunkDrawerFiles } from "./junk-drawer-files.ts";

const offending = findJunkDrawerFiles(
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  }).split("\n"),
);
if (offending.length > 0) {
  process.stderr.write(
    `Catch-all module names are forbidden (docs/engineering/patrones.md §6):\n  ${offending.join("\n  ")}\n`,
  );
  process.exit(1);
}
