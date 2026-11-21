import { readFileSync } from "node:fs";
import { findAiAttribution } from "./ai-attribution.ts";

const offending = findAiAttribution(readFileSync(process.argv[2] ?? "", "utf8"));
if (offending.length > 0) {
  process.stderr.write(
    `Commit messages must not mention AI assistants (see CLAUDE.md):\n  ${offending.join("\n  ")}\n`,
  );
  process.exit(1);
}
