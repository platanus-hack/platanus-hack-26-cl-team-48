import { usePendingSource } from "../../engine/use-source-reconnection.ts";
import { hasFilePicker, pickSourceFile } from "../../library/pick-source-file.ts";
import { Button, Input } from "@nodomics/ui";
import { useRef } from "react";
import { useAddSource } from "../../engine/use-engine-actions.ts";
import { MESSAGES } from "../../messages.ts";
import { asText, type WidgetProps } from "../widget-props.ts";

import { SOURCE_FILE_ACCEPT } from "../../library/source-file-types.ts";

export function SourceWidget({ value, onChange }: WidgetProps<"source">) {
  const fileInput = useRef<HTMLInputElement>(null);
  const addSource = useAddSource();
  const pending = usePendingSource(asText(value));
  const chooseFile = async (file: File | undefined, handle?: FileSystemFileHandle) => {
    if (file === undefined || addSource === undefined) return;
    const added = await addSource(file, handle);
    if (added !== undefined) onChange(added.sourceId);
  };
  const pickFile = async () => {
    if (!hasFilePicker(window)) {
      fileInput.current?.click();
      return;
    }
    try {
      const picked = await pickSourceFile(window);
      if (picked !== undefined) await chooseFile(picked.file, picked.handle);
    } catch {
      /* Cancelling the system picker leaves the source unchanged. */
    }
  };
  return (
    <>
      <Input value={pending.file?.name ?? asText(value)} placeholder={MESSAGES.params.noFile} />
      {pending.file !== undefined &&
        (pending.file.handle !== undefined ? (
          <Button
            onClick={() => {
              void pending.permit();
            }}
          >
            {MESSAGES.savedFlows.allow}
          </Button>
        ) : (
          <p>{MESSAGES.savedFlows.chooseAgain(pending.file.name)}</p>
        ))}
      <Button
        icon="file-spreadsheet"
        disabled={addSource === undefined}
        onClick={() => {
          void pickFile();
        }}
      >
        {MESSAGES.params.chooseFile}
      </Button>
      <input
        ref={fileInput}
        className="web-hidden-input"
        type="file"
        accept={SOURCE_FILE_ACCEPT}
        aria-label={MESSAGES.params.chooseFile}
        onChange={(event) => void chooseFile(event.target.files?.[0])}
      />
    </>
  );
}
