const { defineConfig } = require("eslint/config")

const globals = require("globals")
const tsParser = require("@typescript-eslint/parser")
const typescriptEslint = require("@typescript-eslint/eslint-plugin")
const js = require("@eslint/js")

const { FlatCompat } = require("@eslint/eslintrc")

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

module.exports = defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      sourceType: "module",
      ecmaVersion: 2020,
      parserOptions: {},
    },

    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier"
    ),

    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
])
