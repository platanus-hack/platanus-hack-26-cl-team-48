import { setDiagnostics } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useEffectEvent, useRef } from "react";
import type { CodeDiagnostic } from "./code-diagnostics.ts";
import type { CompleteCode } from "./engine-completions.ts";
import { editorExtensions, fromValue, toDiagnostics } from "./editor-extensions.ts";
import type { CodeEnvironment } from "./local-completions.ts";

export type CodeEditorProps = {
  readonly value: string;
  readonly label: string;
  readonly onChange: (code: string) => void;
  readonly environment: CodeEnvironment;
  readonly complete: CompleteCode | undefined;
  readonly diagnostics: ReadonlyArray<CodeDiagnostic>;
  readonly autoFocus?: boolean;
};

/** A Python editor (CodeMirror) whose text is the form's value. */
export function CodeEditor(props: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const initialState = useEffectEvent(() => ({ value: props.value, autoFocus: props.autoFocus }));
  const reportChange = useEffectEvent((code: string) => {
    props.onChange(code);
  });
  const currentEnvironment = useEffectEvent(() => props.environment);
  const completeNow = useEffectEvent<CompleteCode>((position) =>
    props.complete === undefined ? Promise.resolve([]) : props.complete(position),
  );
  const { label, value, diagnostics } = props;
  useEffect(() => {
    if (host.current === null) return;
    const initial = initialState();
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial.value,
        extensions: editorExtensions({
          label,
          onChange: reportChange,
          environment: currentEnvironment,
          complete: completeNow,
        }),
      }),
    });
    view.current = editor;
    if (initial.autoFocus === true) editor.focus();
    return () => {
      view.current = null;
      editor.destroy();
    };
  }, [label]);
  useEffect(() => {
    const editor = view.current;
    if (editor === null || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: fromValue.of(true),
    });
  }, [value]);
  useEffect(() => {
    const editor = view.current;
    if (editor === null) return;
    editor.dispatch(setDiagnostics(editor.state, toDiagnostics(editor.state.doc, diagnostics)));
  }, [diagnostics, value]);
  return <div ref={host} className="web-code-editor" />;
}
