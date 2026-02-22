/** @typedef {import("net").AddressInfo} AddressInfo */
/** @typedef {import("webpack").StatsAsset} StatsAsset */

const { inspect, types } = require("node:util");
const opener = require("opener");

/** @typedef {import("./BundleAnalyzerPlugin").ExcludeAssets} ExcludeAssets */
/** @typedef {import("./BundleAnalyzerPlugin").AnalyzerUrl} AnalyzerUrl */
/** @typedef {import("./Logger")} Logger */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * @param {ExcludeAssets} excludePatterns exclude patterns
 * @returns {(asset: string) => boolean} function to filter
 */
function createAssetsFilter(excludePatterns) {
  /** @type {((asset: string) => void | boolean)[]} */
  const excludeFunctions = (
    Array.isArray(excludePatterns) ? excludePatterns : [excludePatterns]
  )
    .filter(Boolean)
    .map((pattern) => {
      if (typeof pattern === "string") {
        pattern = new RegExp(pattern, "u");
      }

      if (types.isRegExp(pattern)) {
        return (
          /**
           * @param {string} asset asset
           * @returns {boolean} true when need to exclude, otherwise false
           */
          (asset) => pattern.test(asset)
        );
      }

      if (typeof pattern !== "function") {
        throw new TypeError(
          `Pattern should be either string, RegExp or a function, but "${inspect(pattern, { depth: 0 })}" got.`,
        );
      }

      return pattern;
    });

  if (excludeFunctions.length) {
    return (asset) => excludeFunctions.every((fn) => fn(asset) !== true);
  }

  return () => true;
}

/** @type {AnalyzerUrl} */
function defaultAnalyzerUrl(options) {
  const { listenHost, boundAddress } = options;
  return `http://${listenHost}:${/** @type {AddressInfo} */ (boundAddress).port}`;
}

/**
 * get string of current time, format: dd/MMM HH:mm
 * @returns {string} default title
 */
function defaultTitle() {
  const time = new Date();
  const year = time.getFullYear();
  const month = MONTHS[time.getMonth()];
  const day = time.getDate();
  const hour = `0${time.getHours()}`.slice(-2);
  const minute = `0${time.getMinutes()}`.slice(-2);

  const currentTime = `${day} ${month} ${year} at ${hour}:${minute}`;

  return `${process.env.npm_package_name || "Webpack Bundle Analyzer"} [${currentTime}]`;
}

/**
 * Calls opener on a URI, but silently try / catches it.
 * @param {string} uri URI
 * @param {Logger} logger logger
 */
function open(uri, logger) {
  try {
    opener(uri);
  } catch (err) {
    logger.debug(`Opener failed to open "${uri}":\n${err}`);
  }
}

module.exports = { createAssetsFilter, defaultAnalyzerUrl, defaultTitle, open };
