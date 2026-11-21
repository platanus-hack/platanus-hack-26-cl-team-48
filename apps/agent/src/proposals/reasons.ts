import type { ProposalChange } from "../contracts/proposal.ts";
import type { LlmPort } from "../llm/llm-port.ts";
import type { UnreasonedChange } from "./from-diff.ts";

const FORBIDDEN_WORDS = [
  "flows.",
  "set_param",
  "add_node",
  "remove_node",
  "connect",
  "disconnect",
  "tool_call",
  "tool_result",
  "call_tool",
  "system prompt",
];

function formatVal(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function fallbackReason(change: UnreasonedChange): string {
  if (change.before !== undefined && change.after !== undefined) {
    return `Cambio de ${change.target}: ${formatVal(change.before)} → ${formatVal(change.after)}`;
  }
  if (change.after !== undefined) {
    return `Agregar ${change.target}: ${formatVal(change.after)}`;
  }
  if (change.before !== undefined) {
    return `Quitar ${change.target}: ${formatVal(change.before)}`;
  }
  return `Cambio en ${change.target}`;
}

function containsInstructions(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((word) => lower.includes(word));
}

function parseLlmJson(rawText: string): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return null;
  }
}

function buildPrompt(changes: readonly UnreasonedChange[], context?: unknown): string {
  const contextStr = context ? `Contexto del trabajo: ${JSON.stringify(context)}\n` : "";
  const changesSummary = changes
    .map(
      (c) =>
        `- ID "${c.id}": tipo "${c.kind}", objetivo "${c.target}", antes: ${formatVal(c.before)}, después: ${formatVal(c.after)}`,
    )
    .join("\n");
  return `${contextStr}Explica la razón de cada cambio en español en exactamente una frase por cambio, usando vocabulario del oficio.
Responde ÚNICAMENTE con un objeto JSON cuyas claves sean los ID de los cambios y los valores las frases explicativas.
NO incluyas nombres de herramientas técnicas ni instrucciones de flujo.

Cambios:
${changesSummary}`;
}

const PROPOSAL_CHANGE_KINDS = new Set<string>([
  "add_node",
  "remove_node",
  "connect",
  "disconnect",
  "set_param",
  "add_custom_node",
  "update_custom_node",
]);

function isProposalChangeKind(kind: string): kind is ProposalChange["kind"] {
  return PROPOSAL_CHANGE_KINDS.has(kind);
}

async function requestReasons(
  llm: LlmPort,
  changes: readonly UnreasonedChange[],
  context?: unknown,
): Promise<Record<string, string> | null> {
  const turn = await llm.complete({
    system: "Genera explicaciones concisas y profesionales en español.",
    tools: [],
    messages: [{ role: "user", text: buildPrompt(changes, context) }],
  });
  if (!turn.ok || turn.value.kind !== "text") return null;
  return parseLlmJson(turn.value.text);
}

export async function writeReasons(
  llm: LlmPort,
  changes: readonly UnreasonedChange[],
  context?: unknown,
): Promise<ProposalChange[]> {
  const answers = await requestReasons(llm, changes, context);
  const validChanges = changes.filter((c) => isProposalChangeKind(c.kind));
  return validChanges.map((change) => {
    const rawReason = answers?.[change.id]?.trim();
    const isValid = Boolean(rawReason) && !containsInstructions(rawReason ?? "");
    const reason = isValid ? (rawReason as string) : fallbackReason(change);
    return {
      id: change.id,
      kind: change.kind as ProposalChange["kind"],
      target: change.target,
      ...(change.before !== undefined ? { before: change.before } : {}),
      ...(change.after !== undefined ? { after: change.after } : {}),
      reason,
      dependsOn: [...change.dependsOn],
    };
  });
}
