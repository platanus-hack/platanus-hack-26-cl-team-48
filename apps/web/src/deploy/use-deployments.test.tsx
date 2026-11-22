import { ok } from "@nodomics/protocol";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import { DeployContext } from "./deploy-context.ts";
import type { Deployment, DeployPlan, DeployResult, DeployService } from "./deploy-service.ts";
import { useDeployments } from "./use-deployments.ts";

const FLOW_ID = "flow-1";
const NODE_ID = "service-1";

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function deploymentWith(status: Deployment["status"]): Deployment {
  return {
    id: "deployment-1",
    flowId: FLOW_ID,
    nodeId: NODE_ID,
    status,
    updatedAt: "2026-11-22T10:00:00.000Z",
  };
}

it("keeps the latest deployment status when an earlier refresh finishes later", async () => {
  const first = deferred<DeployResult<readonly Deployment[]>>();
  const second = deferred<DeployResult<readonly Deployment[]>>();
  const replies = [first.promise, second.promise];
  const service: DeployService = {
    plan: () => Promise.resolve(ok({ action: "unchanged", hash: "hash", changes: [] })),
    apply: () => Promise.resolve(ok(deploymentWith("live"))),
    redeploy: () => Promise.resolve(ok(deploymentWith("live"))),
    list: () => replies.shift() ?? Promise.resolve(ok([])),
    remove: () => Promise.resolve(ok(undefined)),
  };
  const { result } = renderHook(() => useDeployments({ flowId: FLOW_ID, nodeId: NODE_ID }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <DeployContext value={service}>{children}</DeployContext>
    ),
  });

  act(() => {
    result.current.refresh();
  });
  await act(async () => {
    second.resolve(ok([deploymentWith("live")]));
    await second.promise;
  });
  await waitFor(() => {
    expect(result.current.deployments).toEqual(ok([deploymentWith("live")]));
  });
  await act(async () => {
    first.resolve(ok([deploymentWith("deploying")]));
    await first.promise;
  });

  expect(result.current.deployments).toEqual(ok([deploymentWith("live")]));
});

it("shows an earlier list reply while the newer refresh is still pending", async () => {
  const first = deferred<DeployResult<readonly Deployment[]>>();
  const second = deferred<DeployResult<readonly Deployment[]>>();
  const replies = [first.promise, second.promise];
  const service: DeployService = {
    plan: () => Promise.resolve(ok({ action: "unchanged", hash: "hash", changes: [] })),
    apply: () => Promise.resolve(ok(deploymentWith("live"))),
    redeploy: () => Promise.resolve(ok(deploymentWith("live"))),
    list: () => replies.shift() ?? Promise.resolve(ok([])),
    remove: () => Promise.resolve(ok(undefined)),
  };
  const { result } = renderHook(() => useDeployments({ flowId: FLOW_ID, nodeId: NODE_ID }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <DeployContext value={service}>{children}</DeployContext>
    ),
  });

  act(() => {
    result.current.refresh();
  });
  await act(async () => {
    first.resolve(ok([deploymentWith("live")]));
    await first.promise;
  });

  expect(result.current.deployments).toEqual(ok([deploymentWith("live")]));
});

it("keeps the latest plan when an earlier plan request finishes later", async () => {
  const first = deferred<DeployResult<DeployPlan>>();
  const second = deferred<DeployResult<DeployPlan>>();
  const replies = [first.promise, second.promise];
  const service: DeployService = {
    plan: () =>
      replies.shift() ?? Promise.resolve(ok({ action: "unchanged", hash: "new", changes: [] })),
    apply: () => Promise.resolve(ok(deploymentWith("live"))),
    redeploy: () => Promise.resolve(ok(deploymentWith("live"))),
    list: () => Promise.resolve(ok([])),
    remove: () => Promise.resolve(ok(undefined)),
  };
  const { result } = renderHook(() => useDeployments({ flowId: FLOW_ID, nodeId: NODE_ID }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <DeployContext value={service}>{children}</DeployContext>
    ),
  });

  act(() => {
    result.current.refresh();
  });
  await act(async () => {
    second.resolve(ok({ action: "update", hash: "new", changes: [] }));
    await second.promise;
  });
  await act(async () => {
    first.resolve(ok({ action: "update", hash: "old", changes: [] }));
    await first.promise;
  });

  expect(result.current.plan).toEqual(ok({ action: "update", hash: "new", changes: [] }));
});
