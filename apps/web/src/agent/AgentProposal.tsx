import { Button } from "@nodomics/ui";
import { useState } from "react";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { useAgent } from "./agent-context.ts";
import type { AgentErrorCode, AgentProposal as Proposal, ProposalCard } from "./agent-service.ts";
import { agentErrorMessage } from "./agent-error-message.ts";

const text = MESSAGES.agent;

type Outcome = "open" | "deciding" | "applied" | "discarded" | AgentErrorCode;

/** The agent's proposed changes: the user picks which to apply, once, or discards them all. */
export function AgentProposal({ proposal }: { readonly proposal: Proposal }) {
  const [chosen, setChosen] = useState(() => new Set(proposal.cards.map((card) => card.changeId)));
  const [outcome, setOutcome] = useState<Outcome>("open");
  const decide = useDecision(proposal, setOutcome);
  const toggle = (changeId: string) => {
    setChosen((current) => {
      const next = new Set(current);
      if (!next.delete(changeId)) next.add(changeId);
      return next;
    });
  };
  const isOpen = outcome === "open";
  return (
    <section className="web-agent-proposal" aria-label={text.choose}>
      <span className="web-agent-draft">{text.draft}</span>
      {proposal.cards.map((card) => (
        <ChangeCard
          key={card.changeId}
          card={card}
          isChosen={chosen.has(card.changeId)}
          isDisabled={!isOpen}
          onToggle={() => {
            toggle(card.changeId);
          }}
        />
      ))}
      {isOpen || outcome === "deciding" ? (
        <div className="web-agent-proposal-actions">
          <Button
            variant="primary"
            disabled={!isOpen || chosen.size === 0}
            onClick={() => void decide([...chosen])}
          >
            {text.apply}
          </Button>
          <Button disabled={!isOpen} onClick={() => void decide([])}>
            {text.discard}
          </Button>
        </div>
      ) : (
        <p className="web-agent-message" role="status">
          {outcomeMessage(outcome)}
        </p>
      )}
    </section>
  );
}

function ChangeCard({
  card,
  isChosen,
  isDisabled,
  onToggle,
}: {
  readonly card: ProposalCard;
  readonly isChosen: boolean;
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="web-agent-change">
      <label className="web-agent-change-title">
        <input type="checkbox" checked={isChosen} disabled={isDisabled} onChange={onToggle} />
        <strong>{card.title}</strong>
      </label>
      {hasValues(card) && <span className="web-agent-change-values">{valuesOf(card)}</span>}
      <span className="web-caption">{card.reason}</span>
    </div>
  );
}

function useDecision(proposal: Proposal, setOutcome: (outcome: Outcome) => void) {
  const agent = useAgent();
  const { savedFlowStore } = useAppStores();
  return async (acceptedIds: readonly string[]) => {
    setOutcome("deciding");
    const result = await agent.decide(proposal.id, { acceptedIds, version: proposal.version });
    if (!result.ok) {
      setOutcome(result.error.code);
      return;
    }
    if (acceptedIds.length === 0) {
      setOutcome("discarded");
      return;
    }
    await savedFlowStore.getState().openFlow(proposal.flowId);
    setOutcome("applied");
  };
}

function outcomeMessage(outcome: Exclude<Outcome, "open" | "deciding">): string {
  if (outcome === "applied") return text.applied;
  if (outcome === "discarded") return text.discarded;
  return agentErrorMessage(outcome);
}

const hasValues = (card: ProposalCard) => card.before !== undefined || card.after !== undefined;

const withUnit = (value: unknown, unit: string | undefined) =>
  [formatValue(value), unit].filter((part) => part !== undefined && part !== "").join(" ");

const valuesOf = (card: ProposalCard) =>
  `${withUnit(card.before, card.unit)} → ${withUnit(card.after, card.unit)}`;

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}
