import type { NepEventPayload, ResultRef } from "@nodomics/protocol";

export function findResult(
  results: readonly NepEventPayload<"node.result">[],
  nodeId: string,
  port: string,
): ResultRef {
  const result = results.findLast((event) => event.nodeId === nodeId && event.port === port);
  if (!result) throw new Error(`Missing node.result for ${nodeId}.${port}`);
  return result.ref;
}
