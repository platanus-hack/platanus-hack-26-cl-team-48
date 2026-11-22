import type { Hub } from "@nodomics/hub";
import { err, ok, type Flow, type NodeManifest } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
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
  { field: "build.startCommand", before: "npm start", after: "node server.js" },
  { field: "env.MODE", after: "prod" },
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

/** The deploy service in memory: it keeps the flow's deployments and records every call. */
function createFakeDeploy(initial: ReadonlyArray<Deployment> = []) {
  const state = { deployments: [...initial] };
  const calls = {
    plan: [] as { flowId: string; nodeId: string }[],
    apply: [] as ApplyRequest[],
    list: [] as string[],
    remove: [] as string[],
  };
  const replies = {
    plans: [Promise.resolve<DeployResult<DeployPlan>>(ok(planOf("create")))],
    apply: undefined as Promise<DeployResult<Deployment>> | undefined,
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
    list: (flowId) => {
      calls.list.push(flowId);
      return Promise.resolve(failed() ?? ok([...state.deployments]));
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

    expect(deploy.calls).toEqual({ plan: [], apply: [], list: [], remove: [] });
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
        screen.queryByText(/build\.startCommand/) !== null,
        screen.queryByText(/env\.MODE/) !== null,
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
