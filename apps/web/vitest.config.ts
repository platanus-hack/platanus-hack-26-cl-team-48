import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "web",
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
