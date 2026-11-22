export type MarkdownBlock =
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "heading"; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly kind: "list"; readonly isOrdered: boolean; readonly items: readonly string[] }
  | { readonly kind: "code"; readonly text: string };

const FENCE = /^```/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;

/** Splits the agent's markdown into blocks; anything it does not recognize stays as text. */
export function parseMarkdownBlocks(markdown: string): readonly MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const [block, next] = readBlock(lines, index);
    if (block !== undefined) blocks.push(block);
    index = next;
  }
  return blocks;
}

function readBlock(lines: readonly string[], start: number): [MarkdownBlock | undefined, number] {
  const line = lines[start] ?? "";
  if (FENCE.test(line)) return readCode(lines, start + 1);
  const heading = HEADING.exec(line);
  if (heading !== null) return [headingOf(heading), start + 1];
  if (BULLET.test(line) || NUMBERED.test(line)) return readList(lines, start);
  if (line.trim() === "") return [undefined, start + 1];
  return readParagraph(lines, start);
}

function headingOf(match: RegExpExecArray): MarkdownBlock {
  const level = Math.min(match[1]?.length ?? 1, 3) as 1 | 2 | 3;
  return { kind: "heading", level, text: match[2] ?? "" };
}

function readCode(lines: readonly string[], start: number): [MarkdownBlock, number] {
  const end = lines.findIndex((line, index) => index >= start && FENCE.test(line));
  const last = end === -1 ? lines.length : end;
  return [{ kind: "code", text: lines.slice(start, last).join("\n") }, last + 1];
}

function readList(lines: readonly string[], start: number): [MarkdownBlock, number] {
  const pattern = NUMBERED.test(lines[start] ?? "") ? NUMBERED : BULLET;
  const items: string[] = [];
  let index = start;
  for (let match = pattern.exec(lines[index] ?? ""); match !== null;) {
    items.push(match[1] ?? "");
    index += 1;
    match = pattern.exec(lines[index] ?? "");
  }
  return [{ kind: "list", isOrdered: pattern === NUMBERED, items }, index];
}

function readParagraph(lines: readonly string[], start: number): [MarkdownBlock, number] {
  let end = start;
  while (end < lines.length && startsParagraphLine(lines[end] ?? "", end === start)) end += 1;
  const text = lines
    .slice(start, end)
    .map((line) => line.trim())
    .join(" ");
  return [{ kind: "paragraph", text }, end];
}

const startsParagraphLine = (line: string, isFirst: boolean) =>
  isFirst ||
  (line.trim() !== "" &&
    !FENCE.test(line) &&
    !HEADING.test(line) &&
    !BULLET.test(line) &&
    !NUMBERED.test(line));
