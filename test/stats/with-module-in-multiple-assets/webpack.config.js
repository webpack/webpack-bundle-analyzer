const path = require("node:path");

// Build two bundles that import different exports from the same module.
module.exports = {
  mode: "production",
  context: __dirname,
  entry: {
    "long-message": "./src/long-message-entry.js",
    "short-message": "./src/short-message-entry.js",
  },
  output: {
    path: __dirname,
    filename: "[name].js",
  },
  optimization: {
    concatenateModules: false,
    runtimeChunk: false,
    splitChunks: false,
    moduleIds: "deterministic",
  },
};
