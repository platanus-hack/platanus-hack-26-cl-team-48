import type { PreviewLocation } from "../layout/workspace-preferences.ts";
import { Segmented } from "../layout/Segmented.tsx";
import { MESSAGES } from "../messages.ts";

export function PreviewLocationControl({
  location,
  onChange,
}: {
  readonly location: PreviewLocation;
  readonly onChange: (location: PreviewLocation) => void;
}) {
  return (
    <>
      <span className="web-island-caption">{MESSAGES.preview.title}</span>
      <Segmented
        label={MESSAGES.preview.location}
        value={location}
        onChange={onChange}
        options={[
          { value: "nodes", label: MESSAGES.preview.inNodes, icon: "layout-grid" },
          { value: "panel", label: MESSAGES.preview.inPanel, icon: "panel-bottom" },
        ]}
      />
    </>
  );
}
