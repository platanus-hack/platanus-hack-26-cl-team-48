const LINE_FEED_BYTE = 10;
const TEXT_SEPARATORS = ["\t", ";", "|", ","] as const;

export function textSeparatorOf(bytes: Uint8Array): string | undefined {
  const firstNewline = bytes.indexOf(LINE_FEED_BYTE);
  const firstLine = new TextDecoder()
    .decode(bytes.subarray(0, firstNewline < 0 ? undefined : firstNewline))
    .replaceAll("\r", "");
  return TEXT_SEPARATORS.find((candidate) => firstLine.includes(candidate));
}
