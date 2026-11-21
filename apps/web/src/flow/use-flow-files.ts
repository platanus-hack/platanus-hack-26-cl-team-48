import { useCallback } from "react";
import { useAppStores, useShowNotice } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { encodeSharedFlow, parseFlowFile, type FlowFileError } from "./flow-file.ts";

import { downloadFlow } from "./download-flow.ts";

const FILE_ERRORS: Record<FlowFileError["kind"], string> = {
  "not-json": MESSAGES.files.notJson,
  invalid: MESSAGES.files.invalidFlow,
};

export const describeFlowFileError = (error: FlowFileError) => FILE_ERRORS[error.kind];

/** Export, import and share of the flow being edited. */
export function useFlowFiles() {
  const { flowStore, savedFlowStore } = useAppStores();
  const showNotice = useShowNotice();
  const exportFlow = useCallback(() => {
    downloadFlow(flowStore.getState().state.flow);
  }, [flowStore]);
  const importFlow = useCallback(
    async (file: File) => {
      const parsed = parseFlowFile(await file.text());
      if (parsed.ok) await savedFlowStore.getState().loadFlow(parsed.value);
      else
        showNotice({
          tone: "error",
          title: MESSAGES.files.importFailed,
          detail: describeFlowFileError(parsed.error),
        });
    },
    [savedFlowStore, showNotice],
  );
  const shareFlow = useCallback(async () => {
    window.history.replaceState(null, "", encodeSharedFlow(flowStore.getState().state.flow));
    const isCopied = await copyToClipboard(window.location.href);
    showNotice({
      tone: "ok",
      title: MESSAGES.files.shareReady,
      ...(isCopied ? { detail: MESSAGES.files.shareCopied } : {}),
    });
  }, [flowStore, showNotice]);
  return { exportFlow, importFlow, shareFlow };
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Browsers refuse clipboard access without permission; the link stays in the address bar.
    return false;
  }
}
