const { readdirSync } = require("node:fs");
const path = require("node:path");
const webpack = require("webpack");

const BundleAnalyzerPlugin = require("../src/BundleAnalyzerPlugin");

/* global it */

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const webpackVersions = {
  4: path.resolve(__dirname, "../node_modules/webpack-4"),
  5: path.resolve(__dirname, "../node_modules/webpack"),
};

async function webpackCompile(config, version) {
  if (version === undefined || version === null) {
    throw new Error("Webpack version is not specified");
  }

  if (!webpackVersions[version]) {
    throw new Error(
      `Webpack version "${version}" is not available for testing`,
    );
  }

  let webpack;

  try {
    webpack = require(webpackVersions[version]);
  } catch (err) {
    throw new Error(
      `Error requiring Webpack ${version}:\n${err}\n\n` +
        'Try running "npm run install-test-webpack-versions".',
      { cause: err },
    );
  }

  await new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        return reject(stats.toJson({ source: false }).errors);
      }

      resolve();
    });
  });
  // Waiting for the next tick (for analyzer report to be generated)
  await wait(1);
}

function makeWebpackConfig(opts = {}) {
  opts = {
    ...opts,
    minify: false,
    multipleChunks: false,
    analyzerOpts: {
      analyzerMode: "static",
      openAnalyzer: false,
      logLevel: "error",
      ...opts.analyzerOpts,
    },
  };

  return {
    context: __dirname,
    mode: "development",
    entry: {
      bundle: "./src",
    },
    output: {
      path: path.resolve(__dirname, "./output"),
      filename: "[name].js",
    },
    optimization: {
      runtimeChunk: {
        name: "manifest",
      },
    },
    plugins: ((plugins) => {
      plugins.push(new BundleAnalyzerPlugin(opts.analyzerOpts));

      if (opts.minify) {
        plugins.push(
          new webpack.optimize.UglifyJsPlugin({
            comments: false,
            mangle: true,
            compress: {
              warnings: false,
              // eslint-disable-next-line camelcase
              negate_iife: false,
            },
          }),
        );
      }

      return plugins;
    })([]),
  };
}

function forEachWebpackVersion(versions, cb) {
  const availableVersions = Object.keys(webpackVersions);

  if (typeof versions === "function") {
    cb = versions;
    versions = availableVersions;
  } else {
    const notFoundVersions = versions.filter(
      (version) => !availableVersions.includes(version),
    );

    if (notFoundVersions.length) {
      throw new Error(
        `These Webpack versions are not currently available for testing: ${notFoundVersions.join(", ")}\n` +
          'You need to install them manually into "test/webpack-versions" directory.',
      );
    }
  }

  for (const version of versions) {
    // eslint-disable-next-line func-style
    const itFn = function itFn(testDescription, ...args) {
      return it.call(this, `${testDescription} (Webpack ${version})`, ...args);
    };

    itFn.only = function only(testDescription, ...args) {
      return it.only.call(
        this,
        `${testDescription} (Webpack ${version})`,
        ...args,
      );
    };

    cb({
      it: itFn,
      version,
      webpackCompile: (config) => webpackCompile(config, version),
    });
  }
}

module.exports = { forEachWebpackVersion, makeWebpackConfig, webpackCompile };
