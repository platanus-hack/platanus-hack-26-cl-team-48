import { formatNumber, ICON_SIZE, Icon } from "@nodomics/ui";
import { lazy, Suspense, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useCodeEditorSize } from "../../layout/code-editor-size.ts";
import { ResizeHandle } from "../../layout/ResizeHandle.tsx";
import { CODE_EDITOR_ROWS_RANGE } from "../../layout/size-range.ts";
import { MESSAGES } from "../../messages.ts";
import { asText, textOrUnset, type WidgetProps } from "../widget-props.ts";
import type { CodeEditorProps } from "./code-editor/CodeEditor.tsx";
import { PlainCodeEditor } from "./PlainCodeEditor.tsx";
import {
  useCodeDiagnostics,
  useCodeEnvironment,
  useEngineCompletion,
} from "./use-code-environment.ts";

/** CodeMirror is loaded the first time code is shown, so it does not weigh on the first load. */
const CodeEditor = lazy(() =>
  import("./code-editor/CodeEditor.tsx")
    .then(({ CodeEditor: Editor }) => ({ default: Editor }))
    // Without the editor (a failed download) the plain text area still edits the code.
    .catch(() => ({ default: PlainCodeEditor })),
);

/** A Python editor with completion and the lines of the last error, inline or enlarged. */
export function CodeWidget({ field, value, nodeId, onChange }: WidgetProps<"code">) {
  const [isExpanded, setExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const editor: CodeEditorProps = {
    value: asText(value),
    label: field.label,
    onChange: (code) => {
      onChange(textOrUnset(code));
    },
    environment: useCodeEnvironment(nodeId),
    complete: useEngineCompletion(nodeId),
    diagnostics: useCodeDiagnostics(nodeId),
  };
  return (
    <div className="web-code-field">
      <ResizableEditor editor={editor} />
      <div className="web-code-footer">
        <span className="web-caption">{MESSAGES.params.editorHint}</span>
        <button
          ref={expandButton}
          type="button"
          className="nd-btn nd-btn-ghost nd-btn-sm"
          onClick={() => {
            setExpanded(true);
          }}
        >
          <Icon name="maximize-2" size={ICON_SIZE.sm} />
          {MESSAGES.params.expandEditor}
        </button>
      </div>
      {isExpanded && (
        <ExpandedEditor
          editor={editor}
          onClose={() => {
            setExpanded(false);
            expandButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}

/** The editor inside the panel, as tall as the rows chosen by dragging the separator under it. */
function ResizableEditor({ editor }: { readonly editor: CodeEditorProps }) {
  const { rows, onResize } = useCodeEditorSize();
  const editorId = useId();
  const box = useRef<HTMLDivElement>(null);
  return (
    <div className="web-code-resizable">
      <div ref={box} id={editorId} className="web-code-box" style={editorRows(rows)}>
        <LoadingEditor {...editor} />
      </div>
      <ResizeHandle
        edge="bottom"
        label={MESSAGES.params.resizeEditor}
        controls={editorId}
        range={CODE_EDITOR_ROWS_RANGE}
        value={rows}
        valueText={MESSAGES.params.editorRows(formatNumber(Math.round(rows)))}
        unitsPerPixel={() => rowsPerPixel(box.current, rows)}
        onResize={onResize}
        className="web-resize-handle"
      />
    </div>
  );
}

const editorRows = (rows: number): CSSProperties & { readonly "--code-rows": number } => ({
  "--code-rows": rows,
});

const rowsPerPixel = (box: HTMLElement | null, rows: number) => {
  const pixels = box?.getBoundingClientRect().height ?? 0;
  return pixels > 0 ? rows / pixels : 0;
};

function LoadingEditor(editor: CodeEditorProps) {
  return (
    <Suspense fallback={<PlainCodeEditor {...editor} />}>
      <CodeEditor {...editor} />
    </Suspense>
  );
}

/** The same editor over the canvas, for code longer than the parameters panel fits. */
function ExpandedEditor({
  editor,
  onClose,
}: {
  readonly editor: CodeEditorProps;
  readonly onClose: () => void;
}) {
  // The panels blur what is behind them, which would trap a fixed element inside them.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editor.label}
      className="web-floating web-code-dialog"
      onKeyDown={(event) => {
        // The editor handles its own Escape (closing completions) and marks it as handled.
        if (event.key === "Escape" && !event.defaultPrevented) onClose();
      }}
    >
      <header className="web-code-dialog-header">
        <h2 className="web-params-title">{editor.label}</h2>
        <button
          type="button"
          className="nd-btn nd-btn-ghost nd-btn-sm nd-btn-icon"
          aria-label={MESSAGES.params.closeEditor}
          onClick={onClose}
        >
          <Icon name="x" size={ICON_SIZE.sm} />
        </button>
      </header>
      <LoadingEditor {...editor} autoFocus />
    </div>,
    document.body,
  );
}
