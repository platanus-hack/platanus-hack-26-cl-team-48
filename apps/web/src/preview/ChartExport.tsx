import type { View } from "vega";
import { useState } from "react";
import { IconMenu } from "../layout/IconMenu.tsx";
import { CHART_EXPORT_MESSAGES as M } from "./chart-export-messages.ts";

export function ChartExport({ view }: { readonly view: Pick<View, "toImageURL"> | undefined }) {
  const [hasFailed, setFailed] = useState(false);
  return (
    <div className="web-chart-export">
      <IconMenu
        label={M.label}
        icon="download"
        disabled={view === undefined}
        items={(["svg", "png"] as const).map((format) => ({
          label: M[format],
          onSelect: () => {
            if (view !== undefined)
              void downloadChart(view, format).catch(() => {
                setFailed(true);
              });
          },
        }))}
      />
      {hasFailed && <p role="status">{M.failed}</p>}
    </div>
  );
}

async function downloadChart(view: Pick<View, "toImageURL">, format: "svg" | "png") {
  const anchor = document.createElement("a");
  anchor.href = await view.toImageURL(format);
  anchor.download = `grafico.${format}`;
  anchor.click();
}
