const { readdirSync } = require("fs");
const webpack = require("webpack");
const partial = require("lodash.partial");

global.webpackCompile = webpackCompile;
global.makeWebpackConfig = makeWebpackConfig;
global.forEachWebpackVersion = forEachWebpackVersion;

const BundleAnalyzerPlugin = require("../lib/BundleAnalyzerPlugin");

/**
 * @template T
 * @typedef {() => T} FunctionReturning
 */

/**
 * @template T
 * @param {FunctionReturning<T>} fn memorized function
 * @returns {FunctionReturning<T>} new function
 */
const memoize = (fn) => {
  let cache = false;
  /** @type {T | undefined} */
  let result;
  return () => {
    if (cache) {
      return /** @type {T} */ (result);
    }

    result = fn();
    cache = true;
    // Allow to clean up memory for fn
    // and all dependent resources
    /** @type {FunctionReturning<T> | undefined} */
    (fn) = undefined;
    return /** @type {T} */ (result);
  };
};

const getAvailableWebpackVersions = memoize(() =>
  readdirSync(`${__dirname}/webpack-versions`, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((dir) => dir.name),
);

function forEachWebpackVersion(versions, cb) {
  const availableVersions = getAvailableWebpackVersions();

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
    const itFn = function (testDescription, ...args) {
      return it.call(this, `${testDescription} (Webpack ${version})`, ...args);
    };

    itFn.only = function (testDescription, ...args) {
      return it.only.call(
        this,
        `${testDescription} (Webpack ${version})`,
        ...args,
      );
    };

    cb({
      it: itFn,
      version,
      webpackCompile: partial(webpackCompile, partial.placeholder, version),
    });
  }
}

async function webpackCompile(config, version) {
  if (version === undefined || version === null) {
    throw new Error("Webpack version is not specified");
  }

  if (!getAvailableWebpackVersions().includes(version)) {
    throw new Error(
      `Webpack version "${version}" is not available for testing`,
    );
  }

  let webpack;

  try {
    webpack = require(`./webpack-versions/${version}/node_modules/webpack`);
  } catch (err) {
    throw new Error(
      `Error requiring Webpack ${version}:\n${err}\n\n` +
        'Try running "npm run install-test-webpack-versions".',
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

function makeWebpackConfig(opts) {
  opts = {
    ...opts,
    minify: false,
    multipleChunks: false,
    analyzerOpts: {
      analyzerMode: "static",
      openAnalyzer: false,
      logLevel: "error",
      ...(opts.analyzerOpts || {}),
    },
  };

  return {
    context: __dirname,
    mode: "development",
    entry: {
      bundle: "./src",
    },
    output: {
      path: `${__dirname}/output`,
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
              negate_iife: false,
            },
          }),
        );
      }

      return plugins;
    })([]),
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
