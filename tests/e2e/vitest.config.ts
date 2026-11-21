import { defineProject } from "vitest/config";

// Only the pure helpers run under Vitest; the demo specs (*.e2e.ts) need a browser and run with `pnpm e2e`.
export default defineProject({
  test: { name: "e2e-support", include: ["src/**/*.test.ts"] },
});
