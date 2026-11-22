import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppDeploy } from "./create-app-deploy.ts";

const DEPLOY_URL = "https://deploy.example.com";
const FLOW_ID = "flow-1";
const NODE_ID = "web";

const session = { getAccessToken: () => Promise.resolve<string | undefined>("token-123") };

type Service = ReturnType<typeof createAppDeploy>;

const OPERATIONS = [
  ["plan", (service: Service) => service.plan({ flowId: FLOW_ID, nodeId: NODE_ID })],
  [
    "apply",
    (service: Service) =>
      service.apply({ flowId: FLOW_ID, nodeId: NODE_ID, planHash: "h", secrets: {} }),
  ],
  [
    "redeploy",
    (service: Service) => service.redeploy({ flowId: FLOW_ID, nodeId: NODE_ID, secrets: {} }),
  ],
  ["list", (service: Service) => service.list(FLOW_ID)],
  ["remove", (service: Service) => service.remove("dep-1")],
] as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAppDeploy without a deploy URL", () => {
  it.each(
    [undefined, ""].flatMap((url) => OPERATIONS.map(([name, call]) => [url, name, call] as const)),
  )("answers NOT_CONFIGURED when the URL is %j (%s) without fetching", async (url, _name, call) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const deploy = createAppDeploy(url === undefined ? {} : { VITE_DEPLOY_URL: url }, session);

    const result = await call(deploy);

    expect({ result, fetched: fetchSpy.mock.calls.length }).toEqual({
      result: { ok: false, error: { code: "NOT_CONFIGURED" } },
      fetched: 0,
    });
  });
});

describe("createAppDeploy with a deploy URL", () => {
  it("calls the deploy service at that URL with the session's token", async () => {
    const fetchSpy = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true, deployments: [] }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const deploy = createAppDeploy({ VITE_DEPLOY_URL: DEPLOY_URL }, session);

    const result = await deploy.list(FLOW_ID);

    const [input, init] = fetchSpy.mock.calls[0] ?? [];
    expect({
      result,
      url: input instanceof Request ? input.url : input?.toString(),
      authorization: new Headers(init?.headers).get("authorization"),
    }).toEqual({
      result: { ok: true, value: [] },
      url: `${DEPLOY_URL}/deployments?flowId=${FLOW_ID}`,
      authorization: "Bearer token-123",
    });
  });
});
