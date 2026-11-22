import { Badge, Button, type BadgeProps } from "@nodomics/ui";
import { useStore } from "zustand";
import { useAppStores, useFlowState } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { ConfirmAction } from "./ConfirmAction.tsx";
import { deployErrorMessage } from "./deploy-error-message.ts";
import { secretsForDeploy } from "./deploy-secrets.ts";
import type { Deployment, DeploymentStatus, DeployPlan, DeployResult } from "./deploy-service.ts";
import {
  canRedeploy,
  hasChangesToDeploy,
  isNotConfigured,
  viewDeployments,
} from "./deploy-view.ts";
import { isHttpsUrl } from "./parse-deploy-reply.ts";
import { useDeployments, type DeploymentsState } from "./use-deployments.ts";

const text = MESSAGES.deploy;

const STATUS_TONES: Readonly<Record<DeploymentStatus, NonNullable<BadgeProps["tone"]>>> = {
  creating: "accent",
  deploying: "accent",
  live: "ok",
  failed: "error",
  suspended: "warn",
};

/** The Despliegue tab of a service node (ADR 0027 §5): plan, deploy, follow and remove it. */
export function DeployPanel({ nodeId }: { readonly nodeId: string }) {
  const { savedFlowStore } = useAppStores();
  const flowId = useStore(savedFlowStore, (state) => state.currentId);
  if (flowId === undefined) return <p className="web-panel-hint">{text.needsSavedFlow}</p>;
  return <FlowDeployments key={`${flowId}/${nodeId}`} flowId={flowId} nodeId={nodeId} />;
}

function FlowDeployments({ flowId, nodeId }: { readonly flowId: string; readonly nodeId: string }) {
  const state = useDeployments({ flowId, nodeId });
  const nodes = useFlowState((flow) => flow.flow.nodes);
  if (isNotConfigured(state.deployments, state.plan))
    return <p className="web-panel-hint">{text.notAvailable}</p>;
  const { own, orphans } = viewDeployments(
    state.deployments?.ok === true ? state.deployments.value : [],
    {
      nodeId,
      flowNodeIds: nodes.map(({ id }) => id),
    },
  );
  return (
    <div className="web-deploy">
      {own !== undefined && <DeploymentCard deployment={own} state={state} />}
      <PlanSection plan={state.plan} />
      <DeployActions nodeId={nodeId} deployment={own} state={state} />
      {state.failure !== undefined && (
        <p className="web-deploy-error" role="alert">
          {deployErrorMessage(state.failure)}
        </p>
      )}
      {state.deployments?.ok === false && (
        <p className="web-deploy-error" role="alert">
          {text.statusFailed}
        </p>
      )}
      {orphans.length > 0 && <Orphans deployments={orphans} state={state} />}
    </div>
  );
}

function DeployActions({
  nodeId,
  deployment,
  state,
}: {
  readonly nodeId: string;
  readonly deployment: Deployment | undefined;
  readonly state: DeploymentsState;
}) {
  const secretsOfNode = useSecretsOfNode(nodeId);
  return (
    <div className="web-deploy-actions">
      <ConfirmAction
        label={text.deploy}
        isDisabled={state.isBusy || !hasChangesToDeploy(state.plan)}
        confirmation={{ question: text.confirmDeployQuestion, label: text.confirmDeploy }}
        onConfirm={() => {
          state.deploy(secretsOfNode());
        }}
      />
      <ConfirmAction
        label={text.redeploy}
        isDisabled={state.isBusy || !canRedeploy(state.plan, deployment)}
        confirmation={{ question: text.confirmRedeployQuestion, label: text.confirmRedeploy }}
        onConfirm={() => {
          state.redeploy(secretsOfNode());
        }}
      />
      <Button size="sm" variant="ghost" icon="rotate-ccw" onClick={state.refresh}>
        {text.refresh}
      </Button>
    </div>
  );
}

/** The credentials the node's environment variables use, read when the user confirms. */
function useSecretsOfNode(nodeId: string): () => Readonly<Record<string, string>> {
  const { secretStore } = useAppStores();
  const secrets = useStore(secretStore, (store) => store.secrets);
  const env = useFlowState(
    (flow) => flow.flow.nodes.find(({ id }) => id === nodeId)?.params["env"],
  );
  return () => secretsForDeploy(env, secrets);
}

const PLAN_FIELD_LABELS: ReadonlyMap<string, string> = new Map(Object.entries(text.planFields));

const planFieldLabel = (field: string): string => PLAN_FIELD_LABELS.get(field) ?? field;

function PlanSection({ plan }: { readonly plan: DeployResult<DeployPlan> | undefined }) {
  return (
    <section className="web-deploy-section" aria-label={text.plan}>
      <h4 className="web-overline">{text.plan}</h4>
      {plan === undefined ? (
        <p className="web-caption" role="status">
          {text.loading}
        </p>
      ) : plan.ok ? (
        <PlanSummary plan={plan.value} />
      ) : (
        <p className="web-deploy-error" role="alert">
          {deployErrorMessage(plan.error.code)}
        </p>
      )}
    </section>
  );
}

function PlanSummary({ plan }: { readonly plan: DeployPlan }) {
  return (
    <>
      <p className="web-deploy-plan">{text.planActions[plan.action]}</p>
      {plan.action !== "unchanged" && plan.changes.length > 0 && (
        <ul className="web-deploy-changes" aria-label={text.changes}>
          {plan.changes.map(({ field }) => (
            <li key={field}>{planFieldLabel(field)}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function DeploymentCard({
  deployment,
  state,
}: {
  readonly deployment: Deployment;
  readonly state: DeploymentsState;
}) {
  return (
    <section className="web-deploy-section web-deploy-card" aria-label={text.service}>
      <div className="web-deploy-status">
        <Badge tone={STATUS_TONES[deployment.status]}>{text.status[deployment.status]}</Badge>
        <DeploymentLink deployment={deployment} />
      </div>
      <RemoveAction deployment={deployment} state={state} />
    </section>
  );
}

function Orphans({
  deployments,
  state,
}: {
  readonly deployments: readonly Deployment[];
  readonly state: DeploymentsState;
}) {
  return (
    <section className="web-deploy-section" aria-label={text.orphans}>
      <h4 className="web-overline">{text.orphans}</h4>
      <p className="web-caption">{text.orphansHint}</p>
      <ul className="web-deploy-orphans">
        {deployments.map((deployment) => (
          <li key={deployment.id} className="web-deploy-card">
            <DeploymentLink deployment={deployment} />
            <RemoveAction deployment={deployment} state={state} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeploymentLink({ deployment }: { readonly deployment: Deployment }) {
  if (!isHttpsUrl(deployment.url)) return <span className="web-caption">{text.noUrl}</span>;
  return (
    <a className="web-deploy-url" href={deployment.url} target="_blank" rel="noreferrer">
      {deployment.url}
    </a>
  );
}

function RemoveAction({
  deployment,
  state,
}: {
  readonly deployment: Deployment;
  readonly state: DeploymentsState;
}) {
  return (
    <div className="web-deploy-actions">
      <ConfirmAction
        label={text.remove}
        isDisabled={state.isBusy}
        confirmation={{ question: text.confirmRemoveQuestion, label: text.confirmRemove }}
        onConfirm={() => {
          state.remove(deployment.id);
        }}
      />
    </div>
  );
}
