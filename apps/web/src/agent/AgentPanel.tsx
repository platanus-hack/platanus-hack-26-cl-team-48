import { Button, Input } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";

const text = MESSAGES.agent;

/**
 * Mockup of the agent (docs/05-capa-agente.md): a conversation whose proposals are accepted
 * change by change. Nothing here is connected yet.
 */
export function AgentPanel() {
  return (
    <div className="web-agent">
      <p className="web-mockup-note">{text.mockup}</p>
      <span className="web-agent-draft">{text.draft}</span>
      <p className="web-agent-message" data-from="user">
        {text.request}
      </p>
      <p className="web-agent-message">{text.answer}</p>
      {text.proposals.map((proposal) => (
        <section key={proposal.title} className="web-agent-proposal" aria-label={proposal.title}>
          <span className="web-overline">{proposal.kind}</span>
          <strong>{proposal.title}</strong>
          <span className="web-caption">{proposal.reason}</span>
          <div className="web-agent-proposal-actions">
            <Button size="sm" variant="primary" disabled>
              {text.accept}
            </Button>
            <Button size="sm" disabled>
              {text.reject}
            </Button>
            <Button size="sm" variant="ghost" disabled>
              {text.viewOnCanvas}
            </Button>
          </div>
        </section>
      ))}
      <div className="web-agent-proposal-actions">
        <Button variant="primary" disabled>
          {text.acceptAll}
        </Button>
        <Button disabled>{text.discard}</Button>
      </div>
      <div className="web-agent-composer">
        <Input label={text.composer} placeholder={text.composerPlaceholder} value="" disabled />
      </div>
    </div>
  );
}
