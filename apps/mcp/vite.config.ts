import { cp } from "node:fs/promises";
import { defineConfig, type Plugin } from "vite";

const OUT_DIR = "dist";

/**
 * nodes-core finds its sample datasets with `new URL("../datasets/…", import.meta.url)`, which
 * stays literal in the bundle: the shared chunk lives one folder down, so the datasets go to
 * `<outDir>/datasets`.
 */
function copySampleDatasets(): Plugin {
  return {
    name: "copy-sample-datasets",
    async writeBundle(options) {
      await cp(
        new URL("../../packages/nodes-core/datasets", import.meta.url),
        `${options.dir ?? OUT_DIR}/datasets`,
        { recursive: true },
      );
    },
  };
}

/**
 * Bundles the service for Node (ADR 0026): the workspace packages are TypeScript sources with
 * Vite-only imports (`?raw`), which Node cannot run as they are.
 */
export default defineConfig({
  plugins: [copySampleDatasets()],
  build: {
    ssr: true,
    rolldownOptions: {
      input: { start: "src/start.ts", "runner-worker": "src/runner-worker.ts" },
      output: { chunkFileNames: "chunks/[name]-[hash].js" },
    },
    outDir: OUT_DIR,
    target: "node24",
    emptyOutDir: true,
  },
  ssr: {
    // These read their own files from node_modules at run time (wasm, the Python distribution).
    external: ["@duckdb/duckdb-wasm", "pyodide", "apache-arrow"],
    noExternal: true,
  },
});
