export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "test", "refactor", "perf", "docs", "build", "ci", "chore", "revert"],
    ],
  },
};
