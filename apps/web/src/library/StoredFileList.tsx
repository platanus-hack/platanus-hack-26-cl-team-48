import { useStore } from "zustand";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { DeleteAction } from "./DeleteAction.tsx";

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const formatSize = (size: number) =>
  size < BYTES_PER_MEGABYTE
    ? `${new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(size / BYTES_PER_KILOBYTE)} KB`
    : `${new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(size / BYTES_PER_MEGABYTE)} MB`;
export function StoredFileList() {
  const { savedFlowStore } = useAppStores();
  const files = useStore(savedFlowStore, (state) => state.storedFiles);
  return (
    <div className="web-saved-list">
      {files.length === 0 && <p>{MESSAGES.savedFlows.noFiles}</p>}
      {files.map((file) => (
        <article key={file.key} className="web-saved-card" aria-label={file.name}>
          <h3>{file.name}</h3>
          <p>
            {formatSize(file.size)} ·{" "}
            {file.bytes !== undefined
              ? MESSAGES.savedFlows.content
              : file.handle !== undefined
                ? MESSAGES.savedFlows.access
                : MESSAGES.savedFlows.metadata}
          </p>
          <DeleteAction onDelete={() => savedFlowStore.getState().removeFile(file.key)} />
        </article>
      ))}
    </div>
  );
}
