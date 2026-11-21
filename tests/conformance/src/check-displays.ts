import type { EngineClient } from "@nodomics/client";
import type { DisplayRef, NepEventPayload } from "@nodomics/protocol";

/** What a case expects of each figure; ids are the engine's own. */
export type ExpectedDisplay = Pick<DisplayRef, "width" | "height" | "title">;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Records the figures every node announces from now on, until `stop`. */
export function collectDisplays(client: EngineClient) {
  const events: NepEventPayload<"node.display">[] = [];
  const stop = client.on("node.display", (event) => {
    events.push(event);
  });
  return {
    of: (nodeId: string) =>
      events.filter((event) => event.nodeId === nodeId).at(-1)?.displays ?? [],
    stop,
  };
}

/** Fails unless the figures match in order, size and title, and each one serves PNG bytes. */
export async function checkDisplays(
  client: EngineClient,
  actual: ReadonlyArray<DisplayRef>,
  expected: ReadonlyArray<ExpectedDisplay>,
): Promise<void> {
  const described = actual.map(({ width, height, title }) => ({ width, height, title }));
  const wanted = expected.map(({ width, height, title }) => ({ width, height, title }));
  if (JSON.stringify(described) !== JSON.stringify(wanted))
    throw new Error(`Expected figures ${JSON.stringify(wanted)}, got ${JSON.stringify(described)}`);
  for (const display of actual) {
    const { bytes } = await client.request("data.display", { ref: display.id });
    if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte))
      throw new Error(`Figure ${display.id} is not a PNG image`);
  }
}
