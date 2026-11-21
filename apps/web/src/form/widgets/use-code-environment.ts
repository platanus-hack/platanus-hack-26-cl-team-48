import { nodePorts } from "@nodomics/protocol";
import { useMemo } from "react";
import { useCatalog, useEngineState, useFlowState } from "../../app-context.ts";
import { useEngineConnection } from "../../engine/engine-connection.ts";
import { useInputColumns } from "../../engine/use-columns.ts";
import type { CompleteCode } from "./code-editor/engine-completions.ts";
import { diagnoseCodeError, type CodeDiagnostic } from "./code-editor/code-diagnostics.ts";
import { toModuleNames, type CodeEnvironment } from "./code-editor/local-completions.ts";

const NO_PORTS: ReadonlyArray<string> = [];

/** What the code editor of a node knows: its inputs and columns, the engine's modules. */
export function useCodeEnvironment(nodeId: string): CodeEnvironment {
  const { ports, columns } = useCodeInputs(nodeId);
  const packages = useEngineState((state) =>
    state.connection.status === "connected"
      ? state.connection.capabilities.pythonPackages
      : undefined,
  );
  return useMemo(
    () => ({
      inputs: ports.map((alias) => ({ alias, columns: columns.get(alias) ?? [] })),
      modules: toModuleNames(packages ?? []),
    }),
    [ports, columns, packages],
  );
}

function useCodeInputs(nodeId: string) {
  const node = useFlowState((state) => state.flow.nodes.find((node) => node.id === nodeId));
  const manifest = useCatalog().find((candidate) => candidate.id === node?.type);
  const ports = useMemo(
    () =>
      manifest === undefined || node === undefined
        ? NO_PORTS
        : nodePorts(manifest, node.params).inputs.map((port) => port.id),
    [manifest, node],
  );
  const columns = useInputColumns(nodeId, ports);
  return { ports, columns };
}

/** Completion by the engine, when the engine announces it. */
export function useEngineCompletion(nodeId: string): CompleteCode | undefined {
  const connection = useEngineConnection();
  const canComplete = useEngineState(
    (state) =>
      state.connection.status === "connected" &&
      state.connection.capabilities.codeCompletion === true,
  );
  return useMemo(() => {
    if (connection === undefined || !canComplete) return undefined;
    return async (position) => {
      // Completion is a convenience: an engine that fails to answer offers nothing.
      const answer = await connection.session
        .complete({ nodeId, ...position })
        .catch(() => ({ items: [] }));
      return answer.items;
    };
  }, [connection, canComplete, nodeId]);
}

/** The lines of the node's code where its last run failed. */
export function useCodeDiagnostics(nodeId: string): ReadonlyArray<CodeDiagnostic> {
  const error = useEngineState((state) => state.nodes[nodeId]?.error);
  return useMemo(() => diagnoseCodeError(error), [error]);
}
