import type { NodeManifest } from "@nodomics/protocol";
import { ICON_SIZE, Icon, Input } from "@nodomics/ui";
import { useMemo, useState } from "react";
import { useCatalog } from "../app-context.ts";
import { NODE_DRAG_TYPE } from "../canvas/drag-types.ts";
import { groupLibrary } from "../canvas/library-groups.ts";
import { iconOf } from "../canvas/node-views.ts";
import { LAYOUT_MESSAGES } from "../layout/messages.ts";
import { PanelToggle } from "../layout/PanelToggle.tsx";
import { MESSAGES } from "../messages.ts";

type LibraryPanelProps = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onAdd: (manifest: NodeManifest) => void;
};

/** The node library, built from the engine's catalog (`nodes.list`) and the flow's custom nodes. */
export function LibraryPanel({ isOpen, onToggle, onAdd }: LibraryPanelProps) {
  const [search, setSearch] = useState("");
  const groups = useLibraryGroups(isOpen ? search : "");
  return (
    <aside
      className="web-floating web-library"
      data-open={isOpen}
      data-canvas-inset="left"
      aria-label={MESSAGES.library.label}
    >
      <div className="web-library-top">
        {isOpen && (
          <Input
            icon="search"
            label={LAYOUT_MESSAGES.searchNodes}
            placeholder={`${LAYOUT_MESSAGES.searchNodes}…`}
            value={search}
            onChange={setSearch}
          />
        )}
        <PanelToggle
          isOpen={isOpen}
          onToggle={onToggle}
          labels={{ hide: LAYOUT_MESSAGES.hideLibrary, show: LAYOUT_MESSAGES.showLibrary }}
          icons={{ hide: "panel-left-close", show: "panel-left-open" }}
        />
      </div>
      <div className="web-library-list">
        {isOpen && groups.length === 0 && (
          <p className="web-panel-hint">{MESSAGES.library.empty}</p>
        )}
        {groups.map((group, index) => (
          <section key={group.category} className="web-library-group" aria-label={group.category}>
            {isOpen ? (
              <h3 className="web-overline">{group.category}</h3>
            ) : (
              index > 0 && <span className="web-library-separator" aria-hidden="true" />
            )}
            {group.nodes.map((manifest) => (
              <LibraryItem key={manifest.id} manifest={manifest} isOpen={isOpen} onAdd={onAdd} />
            ))}
          </section>
        ))}
      </div>
      {isOpen && <p className="web-library-hint">{MESSAGES.library.hint}</p>}
    </aside>
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

function LibraryItem({
  manifest,
  isOpen,
  onAdd,
}: { readonly manifest: NodeManifest } & Omit<LibraryPanelProps, "onToggle">) {
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
      {isOpen && <span className="web-library-name">{manifest.name}</span>}
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
