import type { Column } from "@nodomics/protocol";
import { useEffect, useMemo } from "react";
import { useEngineState, useFlowState } from "../app-context.ts";
import { useEngineConnection } from "./engine-connection.ts";

const NO_COLUMNS: ReadonlyArray<Column> = [];

/** Columns arriving at a node's input port, inferred by the engine without running the flow. */
export function useColumns(nodeId: string, port: string): ReadonlyArray<Column> {
  const source = useFlowState(
    (state) =>
      state.flow.edges.find((edge) => edge.to.node === nodeId && edge.to.port === port)?.from,
  );
  return usePortColumns(source?.node ?? nodeId, source?.port ?? port);
}

/**
 * Columns arriving at each of the given input ports of a node, by port; like `useColumns` for
 * all of them at once. `ports` must keep its identity between renders.
 */
export function useInputColumns(
  nodeId: string,
  ports: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<Column>> {
  const connection = useEngineConnection();
  const rev = useEngineState((state) => state.rev);
  const acceptedRev = useEngineState((state) => state.acceptedRev);
  const schemas = useEngineState((state) => state.schemas);
  const sources = useInputSources(nodeId, ports);
  useEffect(() => {
    if (connection === undefined || acceptedRev !== rev) return;
    sources.forEach(({ from }) => {
      if (from === undefined || schemas[from.node]?.[from.port] !== undefined) return;
      connection.session
        .inferSchema({ rev, nodeId: from.node, port: from.port })
        .catch(() => undefined);
    });
  }, [connection, rev, acceptedRev, sources, schemas]);
  return useMemo(
    () =>
      new Map(
        sources.map(({ port, from }) => [
          port,
          from === undefined ? NO_COLUMNS : (schemas[from.node]?.[from.port] ?? NO_COLUMNS),
        ]),
      ),
    [sources, schemas],
  );
}

/**
 * The columns already known at each of the given input ports, without asking the engine for the
 * others: ports whose columns are unknown are left out. `ports` must keep its identity.
 */
export function useKnownInputColumns(
  nodeId: string,
  ports: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<Column>> {
  const schemas = useEngineState((state) => state.schemas);
  const sources = useInputSources(nodeId, ports);
  return useMemo(
    () =>
      new Map(
        sources.flatMap(({ port, from }) => {
          const columns = from === undefined ? undefined : schemas[from.node]?.[from.port];
          return columns === undefined ? [] : [[port, columns] as const];
        }),
      ),
    [sources, schemas],
  );
}

function useInputSources(nodeId: string, ports: ReadonlyArray<string>) {
  const edges = useFlowState((state) => state.flow.edges);
  return useMemo(
    () =>
      ports.map((port) => ({
        port,
        from: edges.find((edge) => edge.to.node === nodeId && edge.to.port === port)?.from,
      })),
    [edges, nodeId, ports],
  );
}

function usePortColumns(nodeId: string, port: string): ReadonlyArray<Column> {
  const connection = useEngineConnection();
  const rev = useEngineState((state) => state.rev);
  const acceptedRev = useEngineState((state) => state.acceptedRev);
  const columns = useEngineState((state) => state.schemas[nodeId]?.[port]);
  const isKnown = columns !== undefined;
  useEffect(() => {
    if (connection === undefined || isKnown || acceptedRev !== rev) return;
    // A port that cannot be inferred yet simply offers no columns.
    connection.session.inferSchema({ rev, nodeId, port }).catch(() => undefined);
  }, [connection, isKnown, rev, acceptedRev, nodeId, port]);
  return columns ?? NO_COLUMNS;
}
