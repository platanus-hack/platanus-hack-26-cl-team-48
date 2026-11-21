import lockfile from "pyodide/pyodide-lock.json" with { type: "json" };

/**
 * What the Pyodide executor can import, announced before it loads (ADR 0011). The lockfile of
 * the installed pyodide package matches the version the executor downloads.
 */
export const PYODIDE_PACKAGES: ReadonlyArray<string> = Object.keys(lockfile.packages);
