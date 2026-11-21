import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*", "tests/*", "scripts", "!**/.gitkeep"],
    passWithNoTests: true,
  },
});
