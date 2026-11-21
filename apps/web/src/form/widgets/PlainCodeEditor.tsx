import type { CodeEditorProps } from "./code-editor/CodeEditor.tsx";

/** Fixed-width text area: shown while the code editor loads, or if it cannot load. */
export function PlainCodeEditor({ value, label, onChange }: CodeEditorProps) {
  return (
    <textarea
      className="web-code"
      aria-label={label}
      spellCheck={false}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
