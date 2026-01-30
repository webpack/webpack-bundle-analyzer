const BundleAnalyzerPlugin = require("../../lib/BundleAnalyzerPlugin");

module.exports = {
  mode: "development",
  entry: `${__dirname}/src.js`,
  output: {
    path: `${__dirname}/output`,
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
