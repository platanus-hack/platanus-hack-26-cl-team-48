import { defineConfig } from "@playwright/test";
import { APP_ORIGIN, APP_PORT } from "./src/support/app-origin.ts";

const SECOND = 1000;
// Pyodide and DuckDB-WASM load from the network on the first run of each page.
const TEST_TIMEOUT = 240 * SECOND;
const EXPECT_TIMEOUT = 60 * SECOND;
const SERVER_TIMEOUT = 120 * SECOND;

export default defineConfig({
  testDir: "src",
  testMatch: "**/*.e2e.ts",
  timeout: TEST_TIMEOUT,
  expect: { timeout: EXPECT_TIMEOUT },
  fullyParallel: false,
  // Each page boots its own DuckDB-WASM and Pyodide; one worker keeps the 1M-row timing honest.
  workers: 1,
  reporter: [["list"]],
  use: {
    browserName: "chromium",
    baseURL: APP_ORIGIN,
    viewport: { width: 1440, height: 900 },
    headless: true,
    trace: "off",
  },
  webServer: {
    command: `pnpm --filter @nodomics/web dev --port ${String(APP_PORT)} --strictPort`,
    url: APP_ORIGIN,
    reuseExistingServer: !process.env["CI"],
    timeout: SERVER_TIMEOUT,
    stdout: "ignore",
    // Vite forwards the page's console warnings to stderr, which would bury the test report.
    stderr: "ignore",
  },
});
