import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "engines/**", "**/*.cjs", ".claude/**"] },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "import-x": importX },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/consistent-type-definitions": "off",
      "import-x/no-default-export": "error",
      "no-console": "error",
      "max-params": ["error", 3],
      eqeqeq: "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program > VariableDeclaration[kind='let']",
          message:
            "Module-level mutable state is forbidden (patrones.md §6). Inject state instead.",
        },
        {
          selector: "ExportNamedDeclaration > VariableDeclaration[kind='let']",
          message: "Exported mutable bindings are forbidden (patrones.md §6).",
        },
        {
          selector: "ClassDeclaration[superClass]:not([superClass.name='Error'])",
          message:
            "Class inheritance is forbidden except from Error (patrones.md §2.10). Use composition.",
        },
      ],
      "prefer-const": "error",
    },
  },
  {
    files: ["**/*.tsx"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
  {
    files: ["**/*.config.ts", "**/*.config.js"],
    // Tool config files must use a default export.
    rules: { "import-x/no-default-export": "off" },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
);
