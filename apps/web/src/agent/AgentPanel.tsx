import { Button, Input } from "@nodomics/ui";
import { useState, type SyntheticEvent } from "react";
import { MESSAGES } from "../messages.ts";
import { agentErrorMessage } from "./agent-error-message.ts";
import { AgentMarkdown } from "./AgentMarkdown.tsx";
import { AgentProposal } from "./AgentProposal.tsx";
import { useAgentConversation, type Exchange } from "./use-agent-conversation.ts";

const text = MESSAGES.agent;

/**
 * The agent (docs/05-capa-agente.md): the user asks for a change to the open flow (saved first), the agent
 * builds it on a draft, and the user applies the proposed changes they choose.
 */
export function AgentPanel() {
  const { exchanges, isWaiting, ask } = useAgentConversation();
  const [goal, setGoal] = useState("");
  const canSend = !isWaiting && goal.trim() !== "";
  const send = () => {
    if (!canSend) return;
    setGoal("");
    void ask(goal.trim());
  };
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    send();
  };
  return (
    <div className="web-agent">
      {exchanges.map((exchange) => (
        <AgentExchange key={exchange.id} exchange={exchange} />
      ))}
      <form className="web-agent-composer" onSubmit={submit}>
        <Input
          label={text.composer}
          placeholder={text.composerPlaceholder}
          value={goal}
          onChange={setGoal}
        />
        <Button variant="primary" disabled={!canSend} onClick={send}>
          {text.send}
        </Button>
      </form>
    </div>
  );
}

function AgentExchange({ exchange }: { readonly exchange: Exchange }) {
  const { goal, reply } = exchange;
  return (
    <>
      <p className="web-agent-message" data-from="user">
        {goal}
      </p>
      {reply === undefined ? (
        <AgentWorking exchange={exchange} />
      ) : reply.ok ? (
        <>
          <div className="web-agent-message">
            <AgentMarkdown text={reply.value.summary} />
          </div>
          {reply.value.proposal !== undefined && <AgentProposal proposal={reply.value.proposal} />}
        </>
      ) : (
        <p className="web-agent-message" role="alert">
          {agentErrorMessage(reply.error.code)}
        </p>
      )}
    </>
  );
}

function AgentWorking({ exchange: { live, tool } }: { readonly exchange: Exchange }) {
  return (
    <>
      {live.trim() !== "" && (
        <div className="web-agent-message">
          <AgentMarkdown text={live} />
        </div>
      )}
      {tool !== undefined && <p className="web-agent-activity">{text.usingTool(tool)}</p>}
      <p className="web-agent-message web-caption" role="status">
        {text.working}
      </p>
    </>
  );
}
