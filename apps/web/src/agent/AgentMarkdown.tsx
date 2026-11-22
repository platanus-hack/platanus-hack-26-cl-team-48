import type { ReactNode } from "react";
import { parseMarkdownBlocks, type MarkdownBlock } from "./markdown-blocks.ts";

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/;
const HEADING_TAGS = { 1: "h3", 2: "h4", 3: "h5" } as const;

/**
 * The agent's reply with its markdown formatting. It only builds React elements, so any HTML in
 * the text shows as text.
 */
export function AgentMarkdown({ text }: { readonly text: string }) {
  return (
    <div className="web-agent-markdown">
      {parseMarkdownBlocks(text).map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { readonly block: MarkdownBlock }) {
  switch (block.kind) {
    case "paragraph":
      return <p>{renderInline(block.text)}</p>;
    case "heading": {
      const Heading = HEADING_TAGS[block.level];
      return <Heading>{renderInline(block.text)}</Heading>;
    }
    case "list": {
      const List = block.isOrdered ? "ol" : "ul";
      return (
        <List>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </List>
      );
    }
    case "code":
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  for (let match = INLINE.exec(rest); match !== null; match = INLINE.exec(rest)) {
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    nodes.push(inlineElement(match[0], nodes.length));
    rest = rest.slice(match.index + match[0].length);
  }
  if (rest !== "") nodes.push(rest);
  return nodes;
}

function inlineElement(token: string, key: number): ReactNode {
  if (token.startsWith("`")) return <code key={key}>{token.slice(1, -1)}</code>;
  if (token.startsWith("**")) return <strong key={key}>{token.slice(2, -2)}</strong>;
  return <em key={key}>{token.slice(1, -1)}</em>;
}
