const AI_ATTRIBUTION_PATTERNS = [
  /\bclaude\b/i,
  /\banthropic\b/i,
  /co-authored-by:.*\b(ai|assistant|bot|gpt|copilot)\b/i,
  /generated (with|by) .*\b(ai|assistant)\b/i,
];

/** Returns the lines of a commit message that attribute work to an AI assistant. */
export function findAiAttribution(message: string): string[] {
  return message
    .split("\n")
    .filter((line) => AI_ATTRIBUTION_PATTERNS.some((pattern) => pattern.test(line)));
}
