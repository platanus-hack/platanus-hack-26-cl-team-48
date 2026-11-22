import { defineConfig } from "vite";

/**
 * Bundles the service for Node (ADR 0026): the workspace packages are TypeScript sources with
 * Vite-only imports (`?raw`), which Node cannot run as they are.
 */
export default defineConfig({
  build: {
    ssr: "src/start.ts",
    outDir: "dist",
    target: "node24",
    emptyOutDir: true,
  },
  ssr: {
    // These read their own files from node_modules at run time (wasm, the Python distribution).
    external: ["@duckdb/duckdb-wasm", "pyodide", "apache-arrow"],
    noExternal: true,
  },
});
