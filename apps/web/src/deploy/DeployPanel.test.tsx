import type { Hub } from "@nodomics/hub";
import { err, ok, type Flow, type NodeManifest } from "@nodomics/protocol";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import { edgeOf, FILTER, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { HubContext } from "../hub/hub-context.ts";
import { ANA, createTestHub } from "../hub/hub-pages-fixtures.tsx";
import type { Secret } from "../library/flow-library.ts";
import { createMemoryFlowLibrary } from "../library/memory-flow-library.ts";
import { MESSAGES } from "../messages.ts";
import { ParamsPanel } from "../params/ParamsPanel.tsx";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { DeployContext } from "./deploy-context.ts";
import { DeployPanel } from "./DeployPanel.tsx";
import type {
  DeployErrorCode,
  Deployment,
  DeploymentStatus,
  DeployPlan,
  DeployResult,
  DeployService,
} from "./deploy-service.ts";

const FLOW_ID = "flow-1";
const NODE_ID = "web";
const OTHER_SERVICE_ID = "api";
const SITE_URL = "https://nd-ana-web.onrender.com";
const ORPHAN_URL = "https://nd-ana-old.onrender.com";

const DEPLOY = "Desplegar";
const CONFIRM_DEPLOY = "Confirmar despliegue";
const CANCEL = "Cancelar";
const REMOVE = "Eliminar servicio";
const CONFIRM_REMOVE = "Confirmar eliminación";
const REFRESH = "Actualizar estado";
const DEPLOY_TAB = "Despliegue";

const NEEDS_SAVED_FLOW = /Guarda el flujo para desplegarlo/;
const NOT_AVAILABLE = /El hosteo no está disponible/;
const ORPHANS = /Servicios sin nodo/;
const PLAN_TEXT = {
  create: /Se creará un servicio nuevo/,
  update: /Se actualizará el servicio/,
  unchanged: /Sin cambios para desplegar/,
} as const;
const STATUS_TEXT: Readonly<Record<DeploymentStatus, string>> = {
  creating: "Creando",
  deploying: "Desplegando",
  live: "En línea",
  failed: "Falló",
  suspended: "Suspendido",
};

const REPO_MANIFEST: NodeManifest = manifestOf("core.deploy.repo", {
  name: "Repositorio",
  category: "Hosteo",
  icon: "git-branch",
  inputs: [],
  outputs: [{ id: "repo", type: "repo" }],
  params: {
    type: "object",
    properties: {
      url: { type: "string", title: "Repositorio" },
      branch: { type: "string", title: "Rama", default: "main" },
      rootDir: { type: "string", title: "Carpeta" },
    },
    required: ["url"],
  },
  impl: { kind: "resource", resource: "repo" },
});

const SERVICE_MANIFEST: NodeManifest = manifestOf("core.deploy.service", {
  name: "Servicio",
  category: "Hosteo",
  icon: "server",
  inputs: [{ id: "repo", type: "repo" }],
  outputs: [{ id: "service", type: "service" }],
  params: {
    type: "object",
    properties: {
      build: {
        title: "Cómo se construye",
        oneOf: [
          { const: "docker", title: "Docker" },
          { const: "native", title: "Nativo" },
          { const: "static", title: "Estático" },
        ],
        default: "native",
      },
      startCommand: { type: "string", title: "Comando de inicio" },
      env: {
        title: "Variables de entorno",
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "Nombre" },
            value: { type: "string", title: "Valor" },
            secret: { type: "string", title: "Credencial" },
          },
          required: ["name"],
        },
        default: [],
        "x-nodomics": { widget: "key-values" },
      },
    },
    required: ["build"],
  },
  impl: { kind: "resource", resource: "service" },
});

const STRIPE: Secret = { name: "stripe", value: "sk_live_123" };
const UNUSED: Secret = { name: "unused", value: "nunca viaja" };

const ENV = [
  { name: "STRIPE_KEY", secret: STRIPE.name },
  { name: "MODE", value: "prod" },
];

const serviceNode = (id: string, params: Record<string, unknown>) => ({
  ...nodeOf(id, SERVICE_MANIFEST.id),
  params,
});

const FLOW: Flow = flowOf(
  [
    nodeOf("repo", REPO_MANIFEST.id),
    serviceNode(NODE_ID, { build: "native", startCommand: "node server.js", env: ENV }),
    serviceNode(OTHER_SERVICE_ID, { build: "native", startCommand: "node api.js" }),
    nodeOf("f", FILTER.id),
  ],
  [
    edgeOf("e1", ["repo", "repo"], [NODE_ID, "repo"]),
    edgeOf("e2", ["repo", "repo"], [OTHER_SERVICE_ID, "repo"]),
  ],
);

const CHANGES = [
  { field: "build", before: "npm start", after: "node server.js" },
  { field: "env", after: "MODE=prod" },
];
const planOf = (action: DeployPlan["action"]): DeployPlan => ({
  action,
  hash: `hash-${action}`,
  changes: action === "unchanged" ? [] : CHANGES,
});

const deploymentOf = (overrides: Partial<Deployment> = {}): Deployment => ({
  id: `dep-${overrides.nodeId ?? NODE_ID}`,
  flowId: FLOW_ID,
  nodeId: NODE_ID,
  url: SITE_URL,
  status: "live",
  updatedAt: "2026-11-22T10:00:00.000Z",
  ...overrides,
});

type Deferred<T> = { readonly promise: Promise<T>; readonly resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

type ApplyRequest = Parameters<DeployService["apply"]>[0];
type RedeployRequest = Parameters<DeployService["redeploy"]>[0];

/** The deploy service in memory: it keeps the flow's deployments and records every call. */
function createFakeDeploy(initial: ReadonlyArray<Deployment> = []) {
  const state = { deployments: [...initial] };
  const calls = {
    plan: [] as { flowId: string; nodeId: string }[],
    apply: [] as ApplyRequest[],
    list: [] as string[],
    remove: [] as string[],
    redeploy: [] as RedeployRequest[],
  };
  const replies = {
    plans: [Promise.resolve<DeployResult<DeployPlan>>(ok(planOf("create")))],
    apply: undefined as Promise<DeployResult<Deployment>> | undefined,
    redeploy: undefined as Promise<DeployResult<Deployment>> | undefined,
    lists: [] as Promise<DeployResult<readonly Deployment[]>>[],
    failure: undefined as DeployErrorCode | undefined,
  };
  const failed = () => (replies.failure === undefined ? undefined : err({ code: replies.failure }));
  const service: DeployService = {
    plan: (request) => {
      calls.plan.push({ ...request });
      const next = replies.plans.length > 1 ? replies.plans.shift() : replies.plans[0];
      return Promise.resolve(failed() ?? next ?? err({ code: "UNAVAILABLE" }));
    },
    apply: async (request) => {
      calls.apply.push({ ...request, secrets: { ...request.secrets } });
      const result =
        (await replies.apply) ?? ok(deploymentOf({ nodeId: request.nodeId, status: "creating" }));
      if (result.ok)
        state.deployments = [
          ...state.deployments.filter((each) => each.nodeId !== request.nodeId),
          result.value,
        ];
      return result;
    },
    redeploy: async (request) => {
      calls.redeploy.push({ ...request, secrets: { ...request.secrets } });
      const result =
        (await replies.redeploy) ??
        ok(deploymentOf({ nodeId: request.nodeId, status: "deploying" }));
      if (result.ok)
        state.deployments = [
          ...state.deployments.filter((each) => each.nodeId !== request.nodeId),
          result.value,
        ];
      return result;
    },
    list: (flowId) => {
      calls.list.push(flowId);
      return replies.lists.shift() ?? Promise.resolve(failed() ?? ok([...state.deployments]));
    },
    remove: (deploymentId) => {
      calls.remove.push(deploymentId);
      state.deployments = state.deployments.filter((each) => each.id !== deploymentId);
      return Promise.resolve(failed() ?? ok(undefined));
    },
  };
  return {
    service,
    state,
    calls,
    planWith: (...plans: Promise<DeployResult<DeployPlan>>[]) => {
      replies.plans = plans;
    },
    applyWith: (reply: Promise<DeployResult<Deployment>>) => {
      replies.apply = reply;
    },
    redeployWith: (reply: Promise<DeployResult<Deployment>>) => {
      replies.redeploy = reply;
    },
    /** The next `list` call answers with `reply` instead of the current deployments. */
    nextListWith: (reply: Promise<DeployResult<readonly Deployment[]>>) => {
      replies.lists.push(reply);
    },
    failWith: (code: DeployErrorCode) => {
      replies.failure = code;
    },
  };
}

type FakeDeploy = ReturnType<typeof createFakeDeploy>;

async function createStores(currentId: string | undefined): Promise<AppStores> {
  const library = createMemoryFlowLibrary();
  await library.saveSecret(STRIPE);
  await library.saveSecret(UNUSED);
  const stores = createAppStores(FLOW, undefined, library);
  stores.engineStore.getState().dispatch({
    type: "catalog.loaded",
    nodes: [REPO_MANIFEST, SERVICE_MANIFEST, FILTER],
  });
  stores.secretStore.setState({ secrets: [STRIPE, UNUSED] });
  stores.savedFlowStore.setState({ currentId });
  return stores;
}

async function signedInHub(): Promise<Hub> {
  const hub = createTestHub();
  await hub.signIn({ kind: "email", email: ANA.handle });
  return hub;
}

function withDeploy(ui: ReactNode, { hub, deploy }: { hub: Hub; deploy: FakeDeploy }) {
  return (
    <HubContext value={hub}>
      <DeployContext value={deploy.service}>{ui}</DeployContext>
    </HubContext>
  );
}

async function renderPanel(
  options: {
    readonly currentId?: string | undefined;
    readonly deploy?: FakeDeploy;
    readonly nodeId?: string;
  } = {},
) {
  const deploy = options.deploy ?? createFakeDeploy();
  const stores = await createStores("currentId" in options ? options.currentId : FLOW_ID);
  const hub = await signedInHub();
  renderWithStores(
    withDeploy(<DeployPanel nodeId={options.nodeId ?? NODE_ID} />, { hub, deploy }),
    stores,
  );
  return { deploy, stores };
}

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";

/** True when the button is missing or cannot be pressed. */
const cannotPress = (name: string) => {
  const button = screen.queryByRole("button", { name });
  return button === null || isDisabled(button);
};

const linkTo = (href: string) =>
  screen.queryAllByRole("link").find((link) => link.getAttribute("href") === href);

async function openDeployConfirmation() {
  await screen.findByText(PLAN_TEXT.create);
  await userEvent.click(screen.getByRole("button", { name: DEPLOY }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DeployPanel without a saved flow", () => {
  it("asks to save the flow before deploying", async () => {
    await renderPanel({ currentId: undefined });

    expect(await screen.findByText(NEEDS_SAVED_FLOW)).toBeTruthy();
  });

  it("does not call the deploy service", async () => {
    const { deploy } = await renderPanel({ currentId: undefined });

    await screen.findByText(NEEDS_SAVED_FLOW);

    expect(deploy.calls).toEqual({ plan: [], apply: [], list: [], remove: [], redeploy: [] });
  });
});

describe("DeployPanel when hosting is not configured", () => {
  it("says hosting is not available and offers no buttons", async () => {
    const deploy = createFakeDeploy();
    deploy.failWith("NOT_CONFIGURED");

    await renderPanel({ deploy });

    expect({
      isSaid: NOT_AVAILABLE.test((await screen.findByText(NOT_AVAILABLE)).textContent),
      buttons: screen.queryAllByRole("button").length,
    }).toEqual({ isSaid: true, buttons: 0 });
  });
});

describe("DeployPanel opening", () => {
  it("asks for the flow's deployments and the node's plan", async () => {
    const { deploy } = await renderPanel();

    await waitFor(() => {
      expect({ list: deploy.calls.list, plan: deploy.calls.plan }).toEqual({
        list: [FLOW_ID],
        plan: [{ flowId: FLOW_ID, nodeId: NODE_ID }],
      });
    });
  });

  it.each(Object.entries(STATUS_TEXT))(
    "shows the %s status of this node's deployment in Spanish",
    async (status, label) => {
      const deploy = createFakeDeploy([deploymentOf({ status: status as DeploymentStatus })]);

      await renderPanel({ deploy });

      expect((await screen.findByText(new RegExp(label))).textContent).toContain(label);
    },
  );

  it("links to the deployment's URL in a new tab without a referrer", async () => {
    await renderPanel({ deploy: createFakeDeploy([deploymentOf()]) });

    await screen.findByText(/En línea/);

    const link = linkTo(SITE_URL);
    expect({ target: link?.getAttribute("target"), rel: link?.getAttribute("rel") }).toEqual({
      target: "_blank",
      rel: expect.stringContaining("noreferrer") as unknown,
    });
  });

  it("does not show the deployment of another service node as this node's", async () => {
    const deploy = createFakeDeploy([deploymentOf({ nodeId: OTHER_SERVICE_ID })]);

    await renderPanel({ deploy });
    await screen.findByText(PLAN_TEXT.create);

    expect({
      status: screen.queryByText(/En línea/),
      link: linkTo(SITE_URL),
      remove: screen.queryByRole("button", { name: REMOVE }),
    }).toEqual({ status: null, link: undefined, remove: null });
  });
});

describe("DeployPanel plan", () => {
  it.each(["create", "update", "unchanged"] as const)("explains a %s plan", async (action) => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(ok(planOf(action))));

    await renderPanel({ deploy });

    expect(await screen.findByText(PLAN_TEXT[action])).toBeTruthy();
  });

  it.each(["create", "update"] as const)(
    "lists the fields that change in a %s plan",
    async (action) => {
      const deploy = createFakeDeploy();
      deploy.planWith(Promise.resolve(ok(planOf(action))));

      await renderPanel({ deploy });
      await screen.findByText(PLAN_TEXT[action]);

      expect([
        document.body.textContent.includes("Construcción"),
        document.body.textContent.includes("Variables de entorno"),
      ]).toEqual([true, true]);
    },
  );

  it.each([
    ["MISSING_REPO", "MISSING_REPO"],
    ["INVALID_REPO", "INVALID_REPO"],
    ["INVALID_SPEC", "INVALID_SPEC"],
    ["QUOTA_USER", "QUOTA_USER"],
    ["QUOTA_TOTAL", "QUOTA_TOTAL"],
    ["UNAUTHORIZED", "UNAUTHORIZED"],
    ["UNAVAILABLE", "UNAVAILABLE"],
    ["PROVIDER_ERROR", "generic"],
    ["NODE_NOT_FOUND", "generic"],
    ["FLOW_NOT_FOUND", "generic"],
    ["NOT_A_SERVICE", "generic"],
  ] as const)("shows the %s message when the plan fails", async (code, key) => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(err({ code })));

    await renderPanel({ deploy });

    expect(await screen.findByText(MESSAGES.deploy.errors[key])).toBeTruthy();
  });

  it("gives each plan error code its own message", () => {
    const errors = MESSAGES.deploy.errors;

    expect(
      new Set([
        errors.MISSING_REPO,
        errors.INVALID_REPO,
        errors.INVALID_SPEC,
        errors.QUOTA_USER,
        errors.QUOTA_TOTAL,
        errors.UNAUTHORIZED,
        errors.UNAVAILABLE,
        errors.generic,
      ]).size,
    ).toBe(8);
  });
});

describe("DeployPanel deploy button", () => {
  it("is enabled with a create plan", async () => {
    await renderPanel();

    await screen.findByText(PLAN_TEXT.create);

    expect(isDisabled(screen.getByRole("button", { name: DEPLOY }))).toBe(false);
  });

  it("is disabled when there is nothing to deploy", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(ok(planOf("unchanged"))));

    await renderPanel({ deploy });
    await screen.findByText(PLAN_TEXT.unchanged);

    expect(isDisabled(screen.getByRole("button", { name: DEPLOY }))).toBe(true);
  });

  it("is disabled when the plan failed", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(err({ code: "INVALID_SPEC" })));

    await renderPanel({ deploy });
    await screen.findByText(MESSAGES.deploy.errors.INVALID_SPEC);

    expect(isDisabled(screen.getByRole("button", { name: DEPLOY }))).toBe(true);
  });

  it("cannot be pressed while the plan is on its way", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(deferred<DeployResult<DeployPlan>>().promise);

    await renderPanel({ deploy });
    await waitFor(() => {
      expect(deploy.calls.plan.length).toBe(1);
    });

    expect(cannotPress(DEPLOY)).toBe(true);
  });
});

describe("DeployPanel deploying", () => {
  it("asks for confirmation in the page instead of deploying at once", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { deploy } = await renderPanel();

    await openDeployConfirmation();

    expect({
      applied: deploy.calls.apply.length,
      confirm: screen.queryByRole("button", { name: CONFIRM_DEPLOY }) !== null,
      cancel: screen.queryByRole("button", { name: CANCEL }) !== null,
      windowConfirm: confirmSpy.mock.calls.length,
    }).toEqual({ applied: 0, confirm: true, cancel: true, windowConfirm: 0 });
  });

  it("applies the plan's hash with the credentials the node's variables reference", async () => {
    const { deploy } = await renderPanel();
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));

    await waitFor(() => {
      expect(deploy.calls.apply).toEqual([
        {
          flowId: FLOW_ID,
          nodeId: NODE_ID,
          planHash: "hash-create",
          secrets: { [STRIPE.name]: STRIPE.value },
        },
      ]);
    });
  });

  it("uses the env of the node being edited, not the one it opened with", async () => {
    const { deploy, stores } = await renderPanel();
    act(() => {
      stores.flowStore.getState().dispatch({
        type: "param.set",
        nodeId: NODE_ID,
        param: "env",
        value: [{ name: "OTHER_KEY", secret: UNUSED.name }],
      });
    });
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));

    await waitFor(() => {
      expect(deploy.calls.apply.map((request) => request.secrets)).toEqual([
        { [UNUSED.name]: UNUSED.value },
      ]);
    });
  });

  it("shows the deployment apply returns", async () => {
    await renderPanel();
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));

    expect({
      status: (await screen.findByText(/Creando/)).textContent,
      link: linkTo(SITE_URL) !== undefined,
    }).toEqual({ status: expect.stringContaining("Creando") as unknown, link: true });
  });

  it("asks for the plan again after deploying", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(
      Promise.resolve(ok(planOf("create"))),
      Promise.resolve(ok(planOf("unchanged"))),
    );
    await renderPanel({ deploy });
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));

    expect({
      isUnchanged: PLAN_TEXT.unchanged.test(
        (await screen.findByText(PLAN_TEXT.unchanged)).textContent,
      ),
      plans: deploy.calls.plan.length,
    }).toEqual({ isUnchanged: true, plans: 2 });
  });

  it("cannot deploy again while apply is on its way", async () => {
    const { deploy } = await renderPanel();
    deploy.applyWith(deferred<DeployResult<Deployment>>().promise);
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));
    await waitFor(() => {
      expect(deploy.calls.apply.length).toBe(1);
    });

    expect([cannotPress(DEPLOY), cannotPress(CONFIRM_DEPLOY)]).toEqual([true, true]);
  });

  it("does nothing when the confirmation is cancelled", async () => {
    const { deploy } = await renderPanel();
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CANCEL }));

    expect({
      applied: deploy.calls.apply.length,
      confirm: screen.queryByRole("button", { name: CONFIRM_DEPLOY }),
      deploy: screen.queryByRole("button", { name: DEPLOY }) !== null,
    }).toEqual({ applied: 0, confirm: null, deploy: true });
  });
});

describe("DeployPanel removing", () => {
  it("offers to remove the service only when this node has a deployment", async () => {
    await renderPanel();

    await screen.findByText(PLAN_TEXT.create);

    expect(screen.queryByRole("button", { name: REMOVE })).toBeNull();
  });

  it("asks for confirmation in the page before removing", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { deploy } = await renderPanel({ deploy: createFakeDeploy([deploymentOf()]) });
    await screen.findByText(/En línea/);

    await userEvent.click(screen.getByRole("button", { name: REMOVE }));

    expect({
      removed: deploy.calls.remove.length,
      confirm: screen.queryByRole("button", { name: CONFIRM_REMOVE }) !== null,
      cancel: screen.queryByRole("button", { name: CANCEL }) !== null,
      windowConfirm: confirmSpy.mock.calls.length,
    }).toEqual({ removed: 0, confirm: true, cancel: true, windowConfirm: 0 });
  });

  it("removes the deployment once confirmed and stops showing it", async () => {
    const { deploy } = await renderPanel({ deploy: createFakeDeploy([deploymentOf()]) });
    await screen.findByText(/En línea/);

    await userEvent.click(screen.getByRole("button", { name: REMOVE }));
    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REMOVE }));

    await waitFor(() => {
      expect({
        removed: deploy.calls.remove,
        status: screen.queryByText(/En línea/),
        link: linkTo(SITE_URL),
      }).toEqual({ removed: [deploymentOf().id], status: null, link: undefined });
    });
  });

  it("keeps the deployment when the removal is cancelled", async () => {
    const { deploy } = await renderPanel({ deploy: createFakeDeploy([deploymentOf()]) });
    await screen.findByText(/En línea/);

    await userEvent.click(screen.getByRole("button", { name: REMOVE }));
    await userEvent.click(screen.getByRole("button", { name: CANCEL }));

    expect({
      removed: deploy.calls.remove.length,
      status: screen.queryByText(/En línea/) !== null,
    }).toEqual({ removed: 0, status: true });
  });
});

describe("DeployPanel refreshing", () => {
  it("asks for the deployments again and shows their new status", async () => {
    const deploy = createFakeDeploy([deploymentOf({ status: "deploying" })]);
    await renderPanel({ deploy });
    await screen.findByText(/Desplegando/);
    deploy.state.deployments = [deploymentOf({ status: "live" })];

    await userEvent.click(screen.getByRole("button", { name: REFRESH }));

    expect({
      status: (await screen.findByText(/En línea/)).textContent,
      lists: deploy.calls.list.length,
    }).toEqual({ status: expect.stringContaining("En línea") as unknown, lists: 2 });
  });
});

describe("DeployPanel orphan services", () => {
  const ORPHAN = deploymentOf({ id: "dep-gone", nodeId: "gone", url: ORPHAN_URL });

  it("lists deployments whose node left the flow under Servicios sin nodo with their URL", async () => {
    await renderPanel({ deploy: createFakeDeploy([ORPHAN]) });

    expect({
      isListed: ORPHANS.test((await screen.findByText(ORPHANS)).textContent),
      link: linkTo(ORPHAN_URL) !== undefined,
    }).toEqual({ isListed: true, link: true });
  });

  it("removes an orphan service after confirmation", async () => {
    const { deploy } = await renderPanel({ deploy: createFakeDeploy([ORPHAN]) });
    await screen.findByText(ORPHANS);

    await userEvent.click(screen.getByRole("button", { name: REMOVE }));
    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REMOVE }));

    await waitFor(() => {
      expect({ removed: deploy.calls.remove, link: linkTo(ORPHAN_URL) }).toEqual({
        removed: [ORPHAN.id],
        link: undefined,
      });
    });
  });

  it("does not list the deployment of another node that is still in the flow", async () => {
    await renderPanel({ deploy: createFakeDeploy([deploymentOf({ nodeId: OTHER_SERVICE_ID })]) });

    await screen.findByText(PLAN_TEXT.create);

    expect(screen.queryByText(ORPHANS)).toBeNull();
  });
});

describe("ParamsPanel Despliegue tab", () => {
  async function renderParams(options: { readonly selected: string; readonly hub: Hub }) {
    const deploy = createFakeDeploy();
    const stores = await createStores(FLOW_ID);
    stores.selectionStore.getState().select([options.selected]);
    renderWithStores(
      withDeploy(
        <ParamsPanel isOpen onToggle={() => undefined} width={1} onResize={() => undefined} />,
        { hub: options.hub, deploy },
      ),
      stores,
    );
    await act(async () => {
      await options.hub.currentProfile();
    });
    return { deploy };
  }

  const detailTabs = () => screen.getByRole("tablist", { name: "Detalle del nodo" });

  const tabNames = () =>
    within(detailTabs())
      .getAllByRole("tab")
      .map((tab) => tab.textContent);

  it("adds a Despliegue tab to a service node for a signed-in user", async () => {
    await renderParams({ selected: NODE_ID, hub: await signedInHub() });

    await within(detailTabs()).findByRole("tab", { name: DEPLOY_TAB });

    expect(tabNames()).toEqual(["Parámetros", "Puertos", "Historia", DEPLOY_TAB]);
  });

  it("shows the deploy panel of the selected node in the Despliegue tab", async () => {
    const { deploy } = await renderParams({ selected: NODE_ID, hub: await signedInHub() });

    await userEvent.click(await within(detailTabs()).findByRole("tab", { name: DEPLOY_TAB }));

    expect({
      plan: PLAN_TEXT.create.test(
        (await within(screen.getByRole("tabpanel")).findByText(PLAN_TEXT.create)).textContent,
      ),
      requested: deploy.calls.plan,
    }).toEqual({ plan: true, requested: [{ flowId: FLOW_ID, nodeId: NODE_ID }] });
  });

  it("has no Despliegue tab for a node that is not a service", async () => {
    await renderParams({ selected: "f", hub: await signedInHub() });

    expect(tabNames()).toEqual(["Parámetros", "Puertos", "Historia"]);
  });

  it("has no Despliegue tab for the repo node", async () => {
    await renderParams({ selected: "repo", hub: await signedInHub() });

    expect(tabNames()).toEqual(["Parámetros", "Puertos", "Historia"]);
  });

  it("has no Despliegue tab without a session", async () => {
    await renderParams({ selected: NODE_ID, hub: createTestHub() });

    expect(tabNames()).toEqual(["Parámetros", "Puertos", "Historia"]);
  });

  it("does not ask the deploy service for anything until the tab is chosen", async () => {
    const { deploy } = await renderParams({ selected: NODE_ID, hub: await signedInHub() });

    await within(detailTabs()).findByRole("tab", { name: DEPLOY_TAB });

    expect({ plan: deploy.calls.plan, list: deploy.calls.list }).toEqual({ plan: [], list: [] });
  });
});

const REDEPLOY = "Redesplegar";
const CONFIRM_REDEPLOY = "Confirmar redespliegue";
const CONFIRM_REDEPLOY_QUESTION =
  "Se volverá a construir el servicio con el último commit de la rama y las credenciales actuales.";
const RATE_LIMITED_MESSAGE =
  "Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.";
const NO_URL = "Todavía sin dirección";
const REFRESH_INTERVAL_MS = 5000;

/** A fake whose node already has a live deployment and nothing new to deploy. */
function deployedAndUnchanged() {
  const deploy = createFakeDeploy([deploymentOf()]);
  deploy.planWith(Promise.resolve(ok(planOf("unchanged"))));
  return deploy;
}

async function openRedeployConfirmation() {
  await screen.findByText(PLAN_TEXT.unchanged);
  await screen.findByText(/En línea/);
  await userEvent.click(screen.getByRole("button", { name: REDEPLOY }));
}

describe("DeployPanel redeploy button", () => {
  it("is enabled when the node has a deployment and nothing changed", async () => {
    await renderPanel({ deploy: deployedAndUnchanged() });

    await screen.findByText(PLAN_TEXT.unchanged);
    await screen.findByText(/En línea/);

    expect(isDisabled(screen.getByRole("button", { name: REDEPLOY }))).toBe(false);
  });

  it("cannot be pressed when the node has no deployment", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(ok(planOf("unchanged"))));

    await renderPanel({ deploy });
    await screen.findByText(PLAN_TEXT.unchanged);

    expect(cannotPress(REDEPLOY)).toBe(true);
  });

  it.each(["create", "update"] as const)("is disabled with a %s plan", async (action) => {
    const deploy = createFakeDeploy([deploymentOf()]);
    deploy.planWith(Promise.resolve(ok(planOf(action))));

    await renderPanel({ deploy });
    await screen.findByText(PLAN_TEXT[action]);
    await screen.findByText(/En línea/);

    expect(isDisabled(screen.getByRole("button", { name: REDEPLOY }))).toBe(true);
  });
});

describe("DeployPanel redeploying", () => {
  it("asks for confirmation in the page instead of redeploying at once", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { deploy } = await renderPanel({ deploy: deployedAndUnchanged() });

    await openRedeployConfirmation();

    expect({
      redeployed: deploy.calls.redeploy.length,
      question: screen.queryByText(CONFIRM_REDEPLOY_QUESTION) !== null,
      confirm: screen.queryByRole("button", { name: CONFIRM_REDEPLOY }) !== null,
      cancel: screen.queryByRole("button", { name: CANCEL }) !== null,
      windowConfirm: confirmSpy.mock.calls.length,
    }).toEqual({ redeployed: 0, question: true, confirm: true, cancel: true, windowConfirm: 0 });
  });

  it("redeploys the node with the credentials its variables reference once confirmed", async () => {
    const { deploy } = await renderPanel({ deploy: deployedAndUnchanged() });
    await openRedeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REDEPLOY }));

    await waitFor(() => {
      expect(deploy.calls.redeploy).toEqual([
        { flowId: FLOW_ID, nodeId: NODE_ID, secrets: { [STRIPE.name]: STRIPE.value } },
      ]);
    });
  });

  it("shows the new status redeploy returns", async () => {
    await renderPanel({ deploy: deployedAndUnchanged() });
    await openRedeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REDEPLOY }));

    expect((await screen.findByText(/Desplegando/)).textContent).toContain("Desplegando");
  });

  it("does not redeploy when the confirmation is cancelled", async () => {
    const { deploy } = await renderPanel({ deploy: deployedAndUnchanged() });
    await openRedeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CANCEL }));

    expect({
      redeployed: deploy.calls.redeploy.length,
      confirm: screen.queryByRole("button", { name: CONFIRM_REDEPLOY }),
    }).toEqual({ redeployed: 0, confirm: null });
  });

  it("shows the rate limit message when redeploy is refused for too many requests", async () => {
    const deploy = deployedAndUnchanged();
    deploy.redeployWith(Promise.resolve(err({ code: "RATE_LIMITED" })));
    await renderPanel({ deploy });
    await openRedeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REDEPLOY }));

    expect(await screen.findByText(RATE_LIMITED_MESSAGE)).toBeTruthy();
  });
});

describe("DeployPanel asking for the plan again", () => {
  it("asks for the plan and the deployments again when refreshing", async () => {
    const { deploy } = await renderPanel();
    await screen.findByText(PLAN_TEXT.create);

    await userEvent.click(screen.getByRole("button", { name: REFRESH }));

    await waitFor(() => {
      expect({ plans: deploy.calls.plan.length, lists: deploy.calls.list.length }).toEqual({
        plans: 2,
        lists: 2,
      });
    });
  });

  it("shows the plan refreshing returns", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(ok(planOf("create"))), Promise.resolve(ok(planOf("update"))));
    await renderPanel({ deploy });
    await screen.findByText(PLAN_TEXT.create);

    await userEvent.click(screen.getByRole("button", { name: REFRESH }));

    expect(PLAN_TEXT.update.test((await screen.findByText(PLAN_TEXT.update)).textContent)).toBe(
      true,
    );
  });

  it("asks for the plan again by itself after a deploy fails with PLAN_CHANGED", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(ok(planOf("create"))), Promise.resolve(ok(planOf("update"))));
    deploy.applyWith(Promise.resolve(err({ code: "PLAN_CHANGED" })));
    await renderPanel({ deploy });
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));

    expect({
      isUpdate: PLAN_TEXT.update.test((await screen.findByText(PLAN_TEXT.update)).textContent),
      plans: deploy.calls.plan.length,
    }).toEqual({ isUpdate: true, plans: 2 });
  });
});

describe("DeployPanel plan field labels", () => {
  const LABELLED_CHANGES = [
    { field: "repo", before: "https://github.com/ana/web", after: "https://github.com/ana/site" },
    { field: "build", before: "native", after: "docker" },
    { field: "env", after: "MODE=prod" },
    { field: "healthCheckPath", before: "/health", after: "/ready" },
  ];

  async function renderLabelledPlan() {
    const deploy = createFakeDeploy();
    deploy.planWith(
      Promise.resolve(ok({ action: "update", hash: "hash-update", changes: LABELLED_CHANGES })),
    );
    await renderPanel({ deploy });
    await screen.findByText(PLAN_TEXT.update);
    return document.body.textContent;
  }

  it.each([
    ["repo", "Repo"],
    ["build", "Construcción"],
    ["env", "Variables de entorno"],
    ["healthCheckPath", "Comprobación de salud"],
  ])("shows the %s field as %s", async (_field, label) => {
    const text = await renderLabelledPlan();

    expect(text).toContain(label);
  });

  it.each(["Health check", "Health", "Build", "Environment"])(
    "never shows the English label %s for a plan field",
    async (englishLabel) => {
      const text = await renderLabelledPlan();

      expect(text).not.toContain(englishLabel);
    },
  );

  it.each(["repo", "build", "env", "healthCheckPath"])(
    "never shows the raw %s key",
    async (field) => {
      const text = await renderLabelledPlan();

      expect(text).not.toContain(field);
    },
  );
});

describe("DeployPanel error messages", () => {
  it("asks to connect a Repo node when the plan has no repo", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(err({ code: "MISSING_REPO" })));

    await renderPanel({ deploy });

    expect(await screen.findByText("Conecta un nodo Repo a la entrada del servicio.")).toBeTruthy();
  });

  it.each([
    [
      "SERVICE_KIND_CHANGED",
      "No se puede cambiar entre Estático y Docker/Nativo en un servicio desplegado. Elimínalo y vuelve a desplegar.",
    ],
    ["RATE_LIMITED", RATE_LIMITED_MESSAGE],
  ] as const)("shows the %s message when deploying fails", async (code, message) => {
    const deploy = createFakeDeploy();
    deploy.applyWith(Promise.resolve(err({ code })));
    await renderPanel({ deploy });
    await openDeployConfirmation();

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));

    expect(await screen.findByText(message)).toBeTruthy();
  });

  it("shows the RATE_LIMITED message when the plan is refused", async () => {
    const deploy = createFakeDeploy();
    deploy.planWith(Promise.resolve(err({ code: "RATE_LIMITED" })));

    await renderPanel({ deploy });

    expect(await screen.findByText(RATE_LIMITED_MESSAGE)).toBeTruthy();
  });
});

describe("DeployPanel periodic refresh", () => {
  async function renderWithFakeClock(deploy: FakeDeploy) {
    const stores = await createStores(FLOW_ID);
    const hub = await signedInHub();
    vi.useFakeTimers();
    const view = renderWithStores(
      withDeploy(<DeployPanel nodeId={NODE_ID} />, { hub, deploy }),
      stores,
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    return view;
  }

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it("asks for the deployments again every 5 seconds while open", async () => {
    const deploy = createFakeDeploy([deploymentOf()]);
    await renderWithFakeClock(deploy);
    const counts = [deploy.calls.list.length];

    await advance(REFRESH_INTERVAL_MS - 1);
    counts.push(deploy.calls.list.length);
    await advance(1);
    counts.push(deploy.calls.list.length);
    await advance(REFRESH_INTERVAL_MS);
    counts.push(deploy.calls.list.length);

    expect(counts).toEqual([1, 1, 2, 3]);
  });

  it("shows the status the periodic refresh brings", async () => {
    const deploy = createFakeDeploy([deploymentOf({ status: "deploying" })]);
    await renderWithFakeClock(deploy);
    deploy.state.deployments = [deploymentOf({ status: "live" })];

    await advance(REFRESH_INTERVAL_MS);

    expect(screen.queryByText(/En línea/)?.textContent).toContain("En línea");
  });

  it("stops asking for the deployments after the panel closes", async () => {
    const deploy = createFakeDeploy([deploymentOf()]);
    const view = await renderWithFakeClock(deploy);
    const before = deploy.calls.list.length;

    view.unmount();
    await advance(REFRESH_INTERVAL_MS * 3);

    expect(deploy.calls.list.length).toBe(before);
  });
});

describe("DeployPanel out-of-order list replies", () => {
  type ListReply = Deferred<DeployResult<readonly Deployment[]>>;

  async function renderWithFakeClock(deploy: FakeDeploy) {
    const stores = await createStores(FLOW_ID);
    const hub = await signedInHub();
    vi.useFakeTimers();
    renderWithStores(withDeploy(<DeployPanel nodeId={NODE_ID} />, { hub, deploy }), stores);
    await act(() => vi.advanceTimersByTimeAsync(0));
  }

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  const pressRefresh = () =>
    act(async () => {
      fireEvent.click(screen.getByRole("button", { name: REFRESH }));
      await vi.advanceTimersByTimeAsync(0);
    });

  const answer = (reply: ListReply, status: DeploymentStatus) =>
    act(async () => {
      reply.resolve(ok([deploymentOf({ status })]));
      await vi.advanceTimersByTimeAsync(0);
    });

  /** Queues two slow list replies: the first list request gets `earlier`, the next `later`. */
  function queueTwoSlowLists(deploy: FakeDeploy) {
    const earlier: ListReply = deferred();
    const later: ListReply = deferred();
    deploy.nextListWith(earlier.promise);
    deploy.nextListWith(later.promise);
    return { earlier, later };
  }

  const shownStatus = () => ({
    live: screen.queryByText(/En línea/) !== null,
    deploying: screen.queryByText(/Desplegando/) !== null,
  });

  it("keeps the newer status when the refresh list answers after the later periodic one", async () => {
    const deploy = createFakeDeploy([deploymentOf({ status: "deploying" })]);
    await renderWithFakeClock(deploy);
    const { earlier, later } = queueTwoSlowLists(deploy);
    await pressRefresh();
    await advance(REFRESH_INTERVAL_MS);
    await answer(later, "live");

    await answer(earlier, "deploying");

    expect({ lists: deploy.calls.list.length, ...shownStatus() }).toEqual({
      lists: 3,
      live: true,
      deploying: false,
    });
  });

  it("shows each reply that arrives in order when every list takes longer than the poll interval", async () => {
    const SLOW_REPLY_MS = 6000;
    const deploy = createFakeDeploy();
    const opening: ListReply = deferred();
    const firstPoll: ListReply = deferred();
    const secondPoll: ListReply = deferred();
    [opening, firstPoll, secondPoll].forEach((reply) => {
      deploy.nextListWith(reply.promise);
    });
    await renderWithFakeClock(deploy);
    await advance(SLOW_REPLY_MS);
    await answer(opening, "deploying");
    const afterFirstReply = shownStatus();
    await advance(REFRESH_INTERVAL_MS);

    await answer(firstPoll, "live");

    expect({
      lists: deploy.calls.list.length,
      afterFirstReply,
      afterSecondReply: shownStatus(),
    }).toEqual({
      lists: 3,
      afterFirstReply: { live: false, deploying: true },
      afterSecondReply: { live: true, deploying: false },
    });
  });

  it("keeps the newer status when the periodic list answers after the later refresh one", async () => {
    const deploy = createFakeDeploy([deploymentOf({ status: "deploying" })]);
    await renderWithFakeClock(deploy);
    const { earlier, later } = queueTwoSlowLists(deploy);
    await advance(REFRESH_INTERVAL_MS);
    await pressRefresh();
    await answer(later, "live");

    await answer(earlier, "deploying");

    expect({ lists: deploy.calls.list.length, ...shownStatus() }).toEqual({
      lists: 3,
      live: true,
      deploying: false,
    });
  });
});

describe("DeployPanel out-of-order plan replies", () => {
  type PlanReply = Deferred<DeployResult<DeployPlan>>;

  const answer = (reply: PlanReply, action: DeployPlan["action"]) =>
    act(async () => {
      reply.resolve(ok(planOf(action)));
      await reply.promise;
    });

  const shownPlan = () => ({
    unchanged: screen.queryByText(PLAN_TEXT.unchanged) !== null,
    update: screen.queryByText(PLAN_TEXT.update) !== null,
  });

  it("keeps the refreshed plan when the opening plan answers after it", async () => {
    const opening: PlanReply = deferred();
    const deploy = createFakeDeploy();
    deploy.planWith(opening.promise, Promise.resolve(ok(planOf("unchanged"))));
    await renderPanel({ deploy });
    await waitFor(() => {
      expect(deploy.calls.plan.length).toBe(1);
    });
    await userEvent.click(screen.getByRole("button", { name: REFRESH }));
    await screen.findByText(PLAN_TEXT.unchanged);

    await answer(opening, "update");

    expect({ plans: deploy.calls.plan.length, ...shownPlan() }).toEqual({
      plans: 2,
      unchanged: true,
      update: false,
    });
  });

  it("keeps the plan asked after PLAN_CHANGED when an older refresh plan answers later", async () => {
    const refreshed: PlanReply = deferred();
    const applied = deferred<DeployResult<Deployment>>();
    const deploy = createFakeDeploy();
    deploy.planWith(
      Promise.resolve(ok(planOf("create"))),
      refreshed.promise,
      Promise.resolve(ok(planOf("unchanged"))),
    );
    deploy.applyWith(applied.promise);
    await renderPanel({ deploy });
    await openDeployConfirmation();
    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));
    await userEvent.click(screen.getByRole("button", { name: REFRESH }));
    await waitFor(() => {
      expect(deploy.calls.plan.length).toBe(2);
    });
    await act(async () => {
      applied.resolve(err({ code: "PLAN_CHANGED" }));
      await applied.promise;
    });
    await screen.findByText(PLAN_TEXT.unchanged);

    await answer(refreshed, "update");

    expect({ plans: deploy.calls.plan.length, ...shownPlan() }).toEqual({
      plans: 3,
      unchanged: true,
      update: false,
    });
  });
});

describe("DeployPanel stale list replies", () => {
  /** Sends a list request through Actualizar estado whose reply arrives only when resolved. */
  async function sendSlowList(deploy: FakeDeploy) {
    const slowList = deferred<DeployResult<readonly Deployment[]>>();
    deploy.nextListWith(slowList.promise);
    const lists = deploy.calls.list.length;
    await userEvent.click(screen.getByRole("button", { name: REFRESH }));
    await waitFor(() => {
      expect(deploy.calls.list.length).toBe(lists + 1);
    });
    return slowList;
  }

  it("keeps the deployment apply returned when an older list answers later", async () => {
    const { deploy } = await renderPanel();
    await screen.findByText(PLAN_TEXT.create);
    const slowList = await sendSlowList(deploy);
    deploy.applyWith(Promise.resolve(ok(deploymentOf({ status: "deploying" }))));
    await openDeployConfirmation();
    await userEvent.click(screen.getByRole("button", { name: CONFIRM_DEPLOY }));
    await screen.findByText(/Desplegando/);

    await act(async () => {
      slowList.resolve(ok([]));
      await slowList.promise;
    });

    expect(screen.queryByText(/Desplegando/) !== null).toBe(true);
  });

  it("keeps the deployment redeploy returned when an older list answers later", async () => {
    const { deploy } = await renderPanel({ deploy: deployedAndUnchanged() });
    await screen.findByText(/En línea/);
    const slowList = await sendSlowList(deploy);
    await openRedeployConfirmation();
    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REDEPLOY }));
    await screen.findByText(/Desplegando/);

    await act(async () => {
      slowList.resolve(ok([deploymentOf({ status: "live" })]));
      await slowList.promise;
    });

    expect({
      deploying: screen.queryByText(/Desplegando/) !== null,
      live: screen.queryByText(/En línea/),
    }).toEqual({ deploying: true, live: null });
  });

  it("does not bring back a removed deployment when an older list answers later", async () => {
    const { deploy } = await renderPanel({ deploy: createFakeDeploy([deploymentOf()]) });
    await screen.findByText(/En línea/);
    const slowList = await sendSlowList(deploy);
    await userEvent.click(screen.getByRole("button", { name: REMOVE }));
    await userEvent.click(screen.getByRole("button", { name: CONFIRM_REMOVE }));
    await waitFor(() => {
      expect(screen.queryByText(/En línea/)).toBeNull();
    });

    await act(async () => {
      slowList.resolve(ok([deploymentOf()]));
      await slowList.promise;
    });

    expect({ status: screen.queryByText(/En línea/), link: linkTo(SITE_URL) }).toEqual({
      status: null,
      link: undefined,
    });
  });
});

describe("DeployPanel unsafe deployment URLs", () => {
  it.each(["javascript:alert(1)", "http://nd-ana-web.onrender.com"])(
    "shows %s as Todavía sin dirección and never as a link",
    async (url) => {
      await renderPanel({ deploy: createFakeDeploy([deploymentOf({ url })]) });

      await screen.findByText(/En línea/);

      expect({ noUrl: screen.queryByText(NO_URL) !== null, link: linkTo(url) }).toEqual({
        noUrl: true,
        link: undefined,
      });
    },
  );
});
