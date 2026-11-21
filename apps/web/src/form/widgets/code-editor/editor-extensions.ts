import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { globalCompletion, localCompletionSource, python } from "@codemirror/lang-python";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, type Diagnostic } from "@codemirror/lint";
import { Annotation, type Extension, type Text } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import type { CodeDiagnostic } from "./code-diagnostics.ts";
import { toCodePosition, toCompletionOption, type CompleteCode } from "./engine-completions.ts";
import { completeLocally, type CodeEnvironment } from "./local-completions.ts";

/** Pause in typing before completions are asked for, so the engine is not asked per keystroke. */
const COMPLETION_DELAY_MS = 150;
const WORD_BEFORE = /\w*/;
const NAME_OR_MEMBER_BEFORE = /[\w.]+/;
const INSIDE_KEY = /^[^"'\]]*$/;

/** Marks the edits that come from the form's value, which must not be reported back. */
export const fromValue = Annotation.define<boolean>();

export type EditorOptions = {
  readonly label: string;
  readonly onChange: (code: string) => void;
  readonly environment: () => CodeEnvironment;
  readonly complete: CompleteCode;
};

/** Highlighting by class, so the colors come from the design system's stylesheet. */
const HIGHLIGHT = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword], class: "web-code-keyword" },
  { tag: [tags.string, tags.special(tags.string)], class: "web-code-string" },
  { tag: [tags.number, tags.bool, tags.null], class: "web-code-literal" },
  { tag: tags.comment, class: "web-code-comment" },
  {
    tag: [tags.function(tags.definition(tags.variableName)), tags.definition(tags.className)],
    class: "web-code-definition",
  },
  {
    tag: [tags.function(tags.variableName), tags.standard(tags.variableName)],
    class: "web-code-call",
  },
  { tag: [tags.propertyName, tags.attributeName], class: "web-code-property" },
]);

export function editorExtensions(options: EditorOptions): Extension[] {
  return [
    lineNumbers(),
    lintGutter(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    python(),
    syntaxHighlighting(HIGHLIGHT),
    autocompletion({
      override: [
        localSource(options.environment),
        localCompletionSource,
        globalCompletion,
        engineSource(options.complete),
      ],
      activateOnTypingDelay: COMPLETION_DELAY_MS,
    }),
    keymap.of([
      ...closeBracketsKeymap,
      ...completionKeymap,
      ...historyKeymap,
      ...defaultKeymap,
      indentWithTab,
    ]),
    EditorView.contentAttributes.of({ "aria-label": options.label }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some((edit) => edit.annotation(fromValue)))
        options.onChange(update.state.doc.toString());
    }),
  ];
}

export const toDiagnostics = (doc: Text, found: ReadonlyArray<CodeDiagnostic>): Diagnostic[] =>
  found
    .filter(({ line }) => line >= 1 && line <= doc.lines)
    .map(({ line, message }) => ({
      from: doc.line(line).from,
      to: doc.line(line).to,
      severity: "error",
      message,
    }));

const localSource =
  (environment: () => CodeEnvironment): CompletionSource =>
  (context) => {
    const line = context.state.doc.lineAt(context.pos);
    const found = completeLocally(line.text.slice(0, context.pos - line.from), environment());
    return found === undefined
      ? null
      : { from: line.from + found.from, options: [...found.options], validFor: INSIDE_KEY };
  };

const engineSource =
  (complete: CompleteCode): CompletionSource =>
  async (context: CompletionContext): Promise<CompletionResult | null> => {
    if (context.matchBefore(NAME_OR_MEMBER_BEFORE) === null && !context.explicit) return null;
    const code = context.state.doc.toString();
    const items = await complete({ code, ...toCodePosition(code, context.pos) });
    if (context.aborted || items.length === 0) return null;
    return {
      from: context.matchBefore(WORD_BEFORE)?.from ?? context.pos,
      options: items.map(toCompletionOption),
      validFor: /^\w*$/,
    };
  };
