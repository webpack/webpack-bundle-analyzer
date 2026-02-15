"use strict";

const path = require("node:path");
const BundleAnalyzerPlugin = require("../../src/BundleAnalyzerPlugin");

module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, "./src.js"),
  output: {
    path: path.resolve(__dirname, "./output"),
    filename: "bundle.js",
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      reportFilename: "report.html",
      openAnalyzer: false,
    }),
  ],
};
