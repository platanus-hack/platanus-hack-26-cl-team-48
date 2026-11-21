import type { Flow } from "@nodomics/protocol";
import { MESSAGES } from "../messages.ts";
import { serializeFlow } from "./flow-file.ts";

const FILE_EXTENSION = ".nodo.json";
const FILE_TYPE = "application/json";
export function downloadFlow(flow: Flow): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([serializeFlow(flow)], { type: FILE_TYPE }));
  link.download = `${flow.name || MESSAGES.app.untitledFlow}${FILE_EXTENSION}`;
  link.click();
  URL.revokeObjectURL(link.href);
}
