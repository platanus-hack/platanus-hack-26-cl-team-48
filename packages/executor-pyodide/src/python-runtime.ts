// Packages that import this one compile it with their own tsconfig, which misses the ambient
// `?raw` declaration unless it is referenced here.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./python-source.d.ts" />
import type { PyodideInterface } from "pyodide";
import runtimeSource from "./nodomics_executor.py?raw";

const MODULE_NAME = "nodomics_executor";
const RUNTIME_PACKAGES = ["pandas", "pyarrow"];
const MODULE_INSTALLER = [
  "import sys, types",
  "def install_module(name, source):",
  "    module = types.ModuleType(name)",
  "    exec(compile(source, name + '.py', 'exec'), module.__dict__)",
  "    sys.modules[name] = module",
  "install_module",
].join("\n");

export type LogEmitter = (level: string, message: string) => void;

/** Typed view of the Python module that holds the DataFrames; JSON in and out, Arrow as bytes. */
export type PythonRuntime = {
  readonly hasResult: (resultId: string) => boolean;
  readonly importArrow: (arrow: Uint8Array) => string;
  readonly exportArrow: (resultId: string) => Uint8Array;
  readonly loadSource: (format: string, bytes: Uint8Array) => string;
  readonly drop: (idsJson: string) => void;
  readonly hasFigure: (displayId: string) => boolean;
  readonly display: (displayId: string) => Uint8Array;
  /** JSON with the completion `items`, or with `invalid` when the position is outside the code. */
  readonly complete: (position: {
    readonly code: string;
    readonly line: number;
    readonly column: number;
  }) => string;
  readonly page: (window: {
    readonly resultId: string;
    readonly offset: number;
    readonly limit: number;
    readonly sortJson: string;
  }) => string;
  readonly profile: (resultId: string) => string;
  readonly runTask: (taskJson: string, emitLog: LogEmitter) => string;
};

/** Loads pandas and pyarrow, installs the runtime module and binds its functions. */
export async function installPythonRuntime(pyodide: PyodideInterface): Promise<PythonRuntime> {
  await pyodide.loadPackage(RUNTIME_PACKAGES, { messageCallback: () => undefined });
  installModule(pyodide, runtimeSource);
  const bind = (name: string) => bindPythonFunction(pyodide, name);
  const [hasResult, importArrow, exportArrow, loadSource, drop, page, profile, runTask] = [
    bind("has_result"),
    bind("import_arrow"),
    bind("export_arrow"),
    bind("load_source"),
    bind("drop"),
    bind("page"),
    bind("profile"),
    bind("run_task"),
  ];
  const [hasFigure, display, complete] = [bind("has_figure"), bind("display"), bind("complete")];
  return {
    hasResult: (resultId) => hasResult(resultId) === true,
    importArrow: (arrow) => expectText(importArrow(arrow)),
    exportArrow: (resultId) => expectBytes(exportArrow(resultId)),
    loadSource: (format, bytes) => expectText(loadSource(format, bytes)),
    drop: (idsJson) => {
      drop(idsJson);
    },
    hasFigure: (displayId) => hasFigure(displayId) === true,
    display: (displayId) => expectBytes(display(displayId)),
    complete: ({ code, line, column }) => expectText(complete(code, line, column)),
    page: (window) =>
      expectText(page(window.resultId, window.offset, window.limit, window.sortJson)),
    profile: (resultId) => expectText(profile(resultId)),
    runTask: (taskJson, emitLog) => expectText(runTask(taskJson, emitLog)),
  };
}

/**
 * Registers the source as an importable module through Python itself: Pyodide's `FS` is typed
 * with Emscripten globals this repository does not install.
 */
function installModule(pyodide: PyodideInterface, source: string): void {
  expectCallable(pyodide, pyodide.runPython(MODULE_INSTALLER))(MODULE_NAME, source);
}

function bindPythonFunction(
  pyodide: PyodideInterface,
  name: string,
): (...args: unknown[]) => unknown {
  return expectCallable(pyodide, pyodide.pyimport(`${MODULE_NAME}.${name}`));
}

function expectCallable(
  pyodide: PyodideInterface,
  value: unknown,
): (...args: unknown[]) => unknown {
  if (!(value instanceof pyodide.ffi.PyCallable))
    throw new Error("Python runtime function is missing");
  return (...args) => value(...args) as unknown;
}

function expectText(value: unknown): string {
  if (typeof value !== "string") throw new Error("Python runtime returned a non-string value");
  return value;
}

function expectBytes(value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error("Python runtime returned non-binary data");
  return value;
}
