import { isSourceFile } from "../library/source-file-types.ts";
import type { NodeManifest } from "@nodomics/protocol";
import { useReactFlow } from "@xyflow/react";
import { useCallback, type DragEvent } from "react";
import { useCatalog, useShowNotice } from "../app-context.ts";
import { useAddSource } from "../engine/use-engine-actions.ts";
import type { Position } from "../flow/flow-commands.ts";
import { MESSAGES } from "../messages.ts";
import { NODE_DRAG_TYPE } from "./drag-types.ts";
import { useAddNode } from "./use-add-node.ts";

const FILE_SOURCE_TYPE = "core.source.csv";

/** Dropping a library node adds it; dropping files adds a source node for each. */
export function useCanvasDrop() {
  const { screenToFlowPosition } = useReactFlow();
  const catalog = useCatalog();
  const addNode = useAddNode();
  const addFileSource = useAddFileSource();
  return useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const manifest = findManifest(catalog, event.dataTransfer.getData(NODE_DRAG_TYPE));
      if (manifest !== undefined) addNode(manifest, position);
      else [...event.dataTransfer.files].forEach((file) => void addFileSource(file, position));
    },
    [screenToFlowPosition, catalog, addNode, addFileSource],
  );
}

function useAddFileSource() {
  const catalog = useCatalog();
  const addNode = useAddNode();
  const addSource = useAddSource();
  const showNotice = useShowNotice();
  return useCallback(
    async (file: File, position: Position) => {
      const manifest = findManifest(catalog, FILE_SOURCE_TYPE);
      if (!isSourceFile(file.name) || manifest === undefined) {
        showNotice({ tone: "warn", title: MESSAGES.files.sourceFormats, detail: file.name });
        return;
      }
      const added = await addSource?.(file);
      if (added !== undefined)
        addNode(manifest, position, { params: { sourceId: added.sourceId }, label: added.name });
    },
    [catalog, addNode, addSource, showNotice],
  );
}

const findManifest = (catalog: ReadonlyArray<NodeManifest>, type: string) =>
  type === "" ? undefined : catalog.find((manifest) => manifest.id === type);
