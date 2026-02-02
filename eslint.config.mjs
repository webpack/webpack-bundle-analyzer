import { defineConfig, globalIgnores } from "eslint/config";
import config from "eslint-config-webpack";
import configs from "eslint-config-webpack/configs.js";

export default defineConfig([
  globalIgnores([
    // Ignore some test files
    "lib/**/*",
    "public/**/*",
    "test/src/**/*",
    "test/dev-server/**/*",
    "test/bundles/**/*",
    "test/stats/**/*",
    "test/output/**/*",
  ]),
  {
    ignores: ["client/**/*", "src/tree/**/*", "src/sizeUtils.js"],
    extends: [config],
    rules: {
      // We use babel so it will be applied by default
      strict: "off",
    },
  },
  {
    files: ["src/bin/**/*"],
    rules: {
      "no-console": "off",
      "n/hashbang": "off",
      "n/no-process-exit": "off",
      "unicorn/prefer-top-level-await": "off",
    },
  },
  {
    files: ["src/tree/**/*", "src/sizeUtils.js"],
    extends: [configs["node-recommended-module"]],
  },
  {
    files: ["client/**/*"],
    extends: [configs["browser-recommended"]],
    rules: {
      // TODO fix me in future
      "react/prop-types": "off",
      "react/no-deprecated": "off",
    },
  },
]);
