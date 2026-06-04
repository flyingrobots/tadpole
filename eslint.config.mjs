import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ["backend/dist/**", "frontend/dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["backend/src/**/*.ts", "frontend/src/**/*.ts", "frontend/vite.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDirectory,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowBoolean: true,
          allowNever: true,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSTypeAssertion",
          message: "Type assertions bypass runtime truth. Add a runtime guard or parser.",
        },
        {
          selector: "TSAsExpression:not([typeAnnotation.type='TSConstKeyword'])",
          message: "Type assertions bypass runtime truth. Add a runtime guard or parser.",
        },
        {
          selector: "TSEnumDeclaration",
          message: "Use class-backed variants or const objects instead of TypeScript enums.",
        },
      ],
    },
  },
];
