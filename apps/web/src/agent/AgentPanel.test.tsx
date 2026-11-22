import { err, ok } from "@nodomics/protocol";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { MESSAGES } from "../messages.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { AgentContext } from "./agent-context.ts";
import { AgentPanel } from "./AgentPanel.tsx";
import type {
  AgentAnswer,
  AgentErrorCode,
  AgentResult,
  AgentService,
  ProposalCard,
} from "./agent-service.ts";

const FLOW_ID = "flow-1";
const GOAL = "Marca las ventas fuera de lo normal";
const SUMMARY = "Propongo 2 cambios sobre un borrador.";
const FIELD = "Escribe al agente";
const SEND = "Enviar";
const APPLY = "Aplicar seleccionados";
const DISCARD = "Descartar";

const THRESHOLD: ProposalCard = {
  changeId: "change-1",
  title: "Umbral de atípicos",
  before: 2,
  after: 3,
  unit: "desvíos",
  reason: "Con 2 desvíos se marcan demasiadas ventas.",
};
const NEW_NODE: ProposalCard = {
  changeId: "change-2",
  title: "Marcar atípicos",
  reason: "Agrega la columna es_atípico.",
};
const WITH_PROPOSAL: AgentAnswer = {
  summary: SUMMARY,
  proposal: { id: "proposal-1", version: 4, flowId: FLOW_ID, cards: [THRESHOLD, NEW_NODE] },
};

type Deferred<T> = { readonly promise: Promise<T>; readonly resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

type Decision = { readonly acceptedIds: readonly string[]; readonly version: number };

/** An agent whose answers the test chooses, recording every call and the order of events. */
function createFakeAgent(events: string[]) {
  const asks: { goal: string; flowId: string }[] = [];
  const decisions: { proposalId: string; decision: Decision }[] = [];
  let answers: Promise<AgentResult<AgentAnswer>>[] = [Promise.resolve(ok(WITH_PROPOSAL))];
  let decision: Promise<AgentResult<{ readonly status: string }>> = Promise.resolve(
    ok({ status: "accepted" }),
  );
  const service: AgentService = {
    ask: (request) => {
      events.push("ask");
      asks.push({ ...request });
      const next = answers.length > 1 ? answers.shift() : answers[0];
      return next ?? Promise.resolve(err({ code: "UNAVAILABLE" }));
    },
    decide: (proposalId, chosen) => {
      events.push("decide");
      decisions.push({
        proposalId,
        decision: { acceptedIds: [...chosen.acceptedIds], version: chosen.version },
      });
      return decision;
    },
  };
  return {
    service,
    asks,
    decisions,
    answerWith: (...replies: Promise<AgentResult<AgentAnswer>>[]) => {
      answers = replies;
    },
    decideWith: (reply: Promise<AgentResult<{ readonly status: string }>>) => {
      decision = reply;
    },
  };
}

function renderPanel(options: { readonly currentId?: string } = { currentId: FLOW_ID }) {
  const events: string[] = [];
  const opened: string[] = [];
  const agent = createFakeAgent(events);
  const stores = createAppStores();
  const flush = { next: Promise.resolve() };
  stores.savedFlowStore.setState({
    currentId: options.currentId,
    flushPending: async () => {
      events.push("flush:start");
      await flush.next;
      events.push("flush:end");
    },
    openFlow: (id) => {
      events.push("openFlow");
      opened.push(id);
      return Promise.resolve();
    },
  });
  renderWithStores(
    <AgentContext value={agent.service}>
      <AgentPanel />
    </AgentContext>,
    stores,
  );
  return { agent, events, opened, flush };
}

async function send(goal = GOAL) {
  const field = screen.getByRole("textbox", { name: FIELD });
  await userEvent.clear(field);
  await userEvent.type(field, goal);
  await userEvent.click(screen.getByRole("button", { name: SEND }));
}

async function sendAndAwaitProposal() {
  await send();
  await screen.findByText(SUMMARY);
}

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";

const isChecked = (element: HTMLElement) =>
  element instanceof HTMLInputElement
    ? element.checked
    : element.getAttribute("aria-checked") === "true";

const cannotDecide = () =>
  [APPLY, DISCARD].every((name) => {
    const button = screen.queryByRole("button", { name });
    return button === null || isDisabled(button);
  });

describe("AgentPanel without a saved flow", () => {
  it("explains that the agent works on a saved flow", () => {
    renderPanel({});

    expect(screen.getByText(/flujo guardado/i)).toBeTruthy();
  });

  it("disables the request field", () => {
    renderPanel({});

    expect(isDisabled(screen.getByRole("textbox", { name: FIELD }))).toBe(true);
  });
});

describe("AgentPanel asking", () => {
  it("enables the request field when the flow is saved", () => {
    renderPanel();

    expect(isDisabled(screen.getByRole("textbox", { name: FIELD }))).toBe(false);
  });

  it("disables Enviar while the request is empty", () => {
    renderPanel();

    expect(isDisabled(screen.getByRole("button", { name: SEND }))).toBe(true);
  });

  it("enables Enviar once there is a request", async () => {
    renderPanel();

    await userEvent.type(screen.getByRole("textbox", { name: FIELD }), GOAL);

    expect(isDisabled(screen.getByRole("button", { name: SEND }))).toBe(false);
  });

  it("asks the agent with the goal and the current flow id", async () => {
    const { agent } = renderPanel();

    await send();

    await waitFor(() => {
      expect(agent.asks).toEqual([{ goal: GOAL, flowId: FLOW_ID }]);
    });
  });

  it("waits for pending saves to finish before asking", async () => {
    const { events, flush } = renderPanel();
    const save = deferred<undefined>();
    flush.next = save.promise;

    await send();
    const beforeSaving = [...events];
    save.resolve(undefined);

    await waitFor(() => {
      expect(events).toContain("ask");
    });
    expect({ beforeSaving, after: events }).toEqual({
      beforeSaving: ["flush:start"],
      after: ["flush:start", "flush:end", "ask"],
    });
  });

  it("shows the user's request and a working state while the agent answers", async () => {
    const { agent } = renderPanel();
    agent.answerWith(deferred<AgentResult<AgentAnswer>>().promise);

    await send();

    expect({
      request: (await screen.findByText(GOAL, { ignore: "textarea, input, script, style" }))
        .textContent,
      working: (await screen.findByText(/El agente está trabajando/)).textContent,
    }).toEqual({ request: GOAL, working: expect.stringMatching(/trabajando/) });
  });

  it("disables Enviar while the agent answers", async () => {
    const { agent } = renderPanel();
    agent.answerWith(deferred<AgentResult<AgentAnswer>>().promise);

    await send();
    await screen.findByText(/El agente está trabajando/);
    await userEvent.type(screen.getByRole("textbox", { name: FIELD }), "otra cosa");

    expect(isDisabled(screen.getByRole("button", { name: SEND }))).toBe(true);
  });
});

describe("AgentPanel answer", () => {
  it("shows the summary of an answer without proposal and no decision buttons", async () => {
    const { agent } = renderPanel();
    agent.answerWith(Promise.resolve(ok({ summary: "El flujo agrupa por mes." })));

    await send();

    expect({
      summary: (await screen.findByText("El flujo agrupa por mes.")).textContent,
      checkboxes: screen.queryAllByRole("checkbox").length,
      apply: screen.queryByRole("button", { name: APPLY }),
    }).toEqual({ summary: "El flujo agrupa por mes.", checkboxes: 0, apply: null });
  });

  it("shows one card per change with its title and reason", async () => {
    renderPanel();

    await sendAndAwaitProposal();

    expect([
      screen.getByText(THRESHOLD.title).textContent,
      screen.getByText(THRESHOLD.reason).textContent,
      screen.getByText(NEW_NODE.title).textContent,
      screen.getByText(NEW_NODE.reason).textContent,
    ]).toEqual([THRESHOLD.title, THRESHOLD.reason, NEW_NODE.title, NEW_NODE.reason]);
  });

  it("shows the before and after values of a change with their unit", async () => {
    renderPanel();

    await sendAndAwaitProposal();

    expect(document.body.textContent).toMatch(/2\s*desvíos\s*→\s*3\s*desvíos/);
  });

  it("checks every change by default", async () => {
    renderPanel();

    await sendAndAwaitProposal();

    expect(
      [THRESHOLD, NEW_NODE].map((card) =>
        isChecked(screen.getByRole("checkbox", { name: card.title })),
      ),
    ).toEqual([true, true]);
  });

  it("offers Aplicar seleccionados and Descartar", async () => {
    renderPanel();

    await sendAndAwaitProposal();

    expect(
      [APPLY, DISCARD].map((name) => isDisabled(screen.getByRole("button", { name }))),
    ).toEqual([false, false]);
  });

  it("disables Aplicar seleccionados when no change is checked", async () => {
    renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("checkbox", { name: THRESHOLD.title }));
    await userEvent.click(screen.getByRole("checkbox", { name: NEW_NODE.title }));

    expect(isDisabled(screen.getByRole("button", { name: APPLY }))).toBe(true);
  });
});

describe("AgentPanel applying", () => {
  it("sends only the checked changes with the proposal version", async () => {
    const { agent } = renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("checkbox", { name: NEW_NODE.title }));
    await userEvent.click(screen.getByRole("button", { name: APPLY }));

    await waitFor(() => {
      expect(agent.decisions).toEqual([
        { proposalId: "proposal-1", decision: { acceptedIds: ["change-1"], version: 4 } },
      ]);
    });
  });

  it("reloads the proposal's flow after applying", async () => {
    const { opened } = renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: APPLY }));

    await waitFor(() => {
      expect(opened).toEqual([FLOW_ID]);
    });
  });

  it("reloads the flow only after the decision is accepted", async () => {
    const { agent, events, opened } = renderPanel();
    const decision = deferred<AgentResult<{ readonly status: string }>>();
    agent.decideWith(decision.promise);
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: APPLY }));
    const openedBeforeReply = [...opened];
    decision.resolve(ok({ status: "accepted" }));

    await waitFor(() => {
      expect(events).toContain("openFlow");
    });
    expect(openedBeforeReply).toEqual([]);
  });

  it("says the changes were applied", async () => {
    renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: APPLY }));

    expect(await screen.findByText(/Cambios aplicados/)).toBeTruthy();
  });

  it("does not let the proposal be decided again after applying", async () => {
    renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: APPLY }));
    await screen.findByText(/Cambios aplicados/);

    expect(cannotDecide()).toBe(true);
  });
});

describe("AgentPanel discarding", () => {
  it("rejects every change with the proposal version", async () => {
    const { agent } = renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: DISCARD }));

    await waitFor(() => {
      expect(agent.decisions).toEqual([
        { proposalId: "proposal-1", decision: { acceptedIds: [], version: 4 } },
      ]);
    });
  });

  it("says the proposal was discarded and does not reload the flow", async () => {
    const { opened } = renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: DISCARD }));

    expect({
      said: (await screen.findByText(/Propuesta descartada/)).textContent,
      opened,
    }).toEqual({ said: expect.stringMatching(/Propuesta descartada/), opened: [] });
  });

  it("does not let the proposal be decided again after discarding", async () => {
    renderPanel();
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: DISCARD }));
    await screen.findByText(/Propuesta descartada/);

    expect(cannotDecide()).toBe(true);
  });
});

describe("AgentPanel errors", () => {
  const failed = (code: AgentErrorCode) => Promise.resolve(err({ code }));

  it("says the flow changed when applying a stale proposal, without reloading it", async () => {
    const { agent, opened } = renderPanel();
    agent.decideWith(failed("STALE"));
    await sendAndAwaitProposal();

    await userEvent.click(screen.getByRole("button", { name: APPLY }));

    expect({
      said: (await screen.findByText(/El flujo cambió mientras el agente trabajaba/)).textContent,
      opened,
    }).toEqual({ said: expect.stringMatching(/vuelve a pedirlo/), opened: [] });
  });

  it("uses the stale message from the agent messages", () => {
    expect(MESSAGES.agent.errors.STALE).toMatch(
      /El flujo cambió mientras el agente trabajaba; vuelve a pedirlo/,
    );
  });

  it.each([
    ["STALE", "STALE"],
    ["RATE_LIMITED", "RATE_LIMITED"],
    ["TIMEOUT", "TIMEOUT"],
    ["UNAUTHENTICATED", "UNAUTHENTICATED"],
    ["UNAVAILABLE", "generic"],
    ["NOT_FOUND", "generic"],
    ["INVALID", "generic"],
  ] as const)("shows the %s message when asking fails", async (code, key) => {
    const { agent } = renderPanel();
    agent.answerWith(failed(code));

    await send();

    expect(await screen.findByText(MESSAGES.agent.errors[key])).toBeTruthy();
  });

  it("gives each error code its own message", () => {
    const { STALE, RATE_LIMITED, TIMEOUT, UNAUTHENTICATED, generic } = MESSAGES.agent.errors;

    expect(new Set([STALE, RATE_LIMITED, TIMEOUT, UNAUTHENTICATED, generic]).size).toBe(5);
  });

  it("lets the user ask again after an error", async () => {
    const { agent } = renderPanel();
    agent.answerWith(failed("TIMEOUT"), Promise.resolve(ok({ summary: "Ahora sí." })));
    await send();
    await screen.findByText(MESSAGES.agent.errors.TIMEOUT);

    await send("Inténtalo de nuevo");

    expect({
      summary: (await screen.findByText("Ahora sí.")).textContent,
      goals: agent.asks.map((request) => request.goal),
    }).toEqual({ summary: "Ahora sí.", goals: [GOAL, "Inténtalo de nuevo"] });
  });
});

describe("AgentPanel connected", () => {
  it("no longer says it is a mockup", () => {
    renderPanel();

    expect(screen.queryByText(/Maqueta/)).toBeNull();
  });
});
