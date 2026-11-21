import type { NodeManifest } from "@nodomics/protocol";
import { ICON_SIZE, Icon, Input } from "@nodomics/ui";
import { useMemo, useState } from "react";
import { useCatalog } from "../app-context.ts";
import { NODE_DRAG_TYPE } from "../canvas/drag-types.ts";
import { groupLibrary } from "../canvas/library-groups.ts";
import { iconOf } from "../canvas/node-views.ts";
import { LAYOUT_MESSAGES } from "../layout/messages.ts";
import { MESSAGES } from "../messages.ts";

type LibraryPanelProps = {
  readonly onAdd: (manifest: NodeManifest) => void;
};

/**
 * The node library, built from the engine's catalog (`nodes.list`) and the flow's custom nodes;
 * the side panel frames it.
 */
export function LibraryPanel({ onAdd }: LibraryPanelProps) {
  const [search, setSearch] = useState("");
  const groups = useLibraryGroups(search);
  return (
    <>
      <div className="web-library-top">
        <Input
          type="search"
          icon="search"
          label={LAYOUT_MESSAGES.searchNodes}
          placeholder={`${LAYOUT_MESSAGES.searchNodes}…`}
          value={search}
          onChange={setSearch}
        />
      </div>
      <div className="web-library-list">
        {groups.length === 0 && <p className="web-panel-hint">{MESSAGES.library.empty}</p>}
        {groups.map((group) => (
          <section key={group.category} className="web-library-group" aria-label={group.category}>
            <h3 className="web-overline">{group.category}</h3>
            {group.nodes.map((manifest) => (
              <LibraryItem key={manifest.id} manifest={manifest} onAdd={onAdd} />
            ))}
          </section>
        ))}
      </div>
      <p className="web-library-hint">{MESSAGES.library.hint}</p>
    </>
  );
}

function useLibraryGroups(search: string) {
  const catalog = useCatalog();
  return useMemo(
    () =>
      groupLibrary(
        catalog.filter((manifest) =>
          `${manifest.name} ${manifest.description ?? ""}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
        ),
      ),
    [catalog, search],
  );
}

function LibraryItem({ manifest, onAdd }: { readonly manifest: NodeManifest } & LibraryPanelProps) {
  return (
    <button
      type="button"
      draggable
      className="web-library-item"
      title={describeLibraryNode(manifest)}
      aria-label={manifest.name}
      onDragStart={(event) => {
        event.dataTransfer.setData(NODE_DRAG_TYPE, manifest.id);
      }}
      onDoubleClick={() => {
        onAdd(manifest);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onAdd(manifest);
      }}
    >
      <span className="web-node-icon">
        <Icon name={iconOf(manifest)} size={ICON_SIZE.sm} />
      </span>
      <span className="web-library-name">{manifest.name}</span>
    </button>
  );
}

const TRAILING_PERIOD = /\.$/u;

/** "Filtrar: conserva las filas…", the tooltip that explains a node before adding it. */
function describeLibraryNode({ name, description }: NodeManifest): string {
  if (description === undefined) return name;
  const sentence = description.replace(TRAILING_PERIOD, "");
  return `${name}: ${sentence.charAt(0).toLocaleLowerCase()}${sentence.slice(1)}`;
}
