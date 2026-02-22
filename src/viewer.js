const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { bold } = require("picocolors");
const sirv = require("sirv");
const WebSocket = require("ws");

const Logger = require("./Logger");
const analyzer = require("./analyzer");
const { renderViewer } = require("./template");
const { open } = require("./utils");

/** @typedef {import("http").Server} Server */
/** @typedef {import("ws").WebSocketServer} WebSocketServer */
/** @typedef {import("webpack").StatsCompilation} StatsCompilation */
/** @typedef {import("./BundleAnalyzerPlugin").Sizes} Sizes */
/** @typedef {import("./BundleAnalyzerPlugin").CompressionAlgorithm} CompressionAlgorithm */
/** @typedef {import("./BundleAnalyzerPlugin").ReportTitle} ReportTitle */
/** @typedef {import("./BundleAnalyzerPlugin").AnalyzerUrl} AnalyzerUrl */
/** @typedef {import("./BundleAnalyzerPlugin").ExcludeAssets} ExcludeAssets */
/** @typedef {import("./analyzer").ViewerDataOptions} ViewerDataOptions */
/** @typedef {import("./analyzer").ChartData} ChartData */

const projectRoot = path.resolve(__dirname, "..");

/**
 * @param {string | (() => string)} reportTitle report title
 * @returns {string} resolved title
 */
function resolveTitle(reportTitle) {
  if (typeof reportTitle === "function") {
    return reportTitle();
  }

  return reportTitle;
}

/**
 * @param {Sizes} defaultSizes default sizes
 * @param {CompressionAlgorithm} compressionAlgorithm compression algorithm
 * @returns {Sizes} default sizes
 */
function resolveDefaultSizes(defaultSizes, compressionAlgorithm) {
  if (["gzip", "brotli", "zstd"].includes(defaultSizes)) {
    return compressionAlgorithm;
  }

  return defaultSizes;
}

/** @typedef {(string | undefined | null)[]} Entrypoints */

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @returns {Entrypoints} entrypoints
 */
function getEntrypoints(bundleStats) {
  if (
    bundleStats === null ||
    bundleStats === undefined ||
    !bundleStats.entrypoints
  ) {
    return [];
  }

  return Object.values(bundleStats.entrypoints).map(
    (entrypoint) => entrypoint.name,
  );
}

/**
 * @param {ViewerDataOptions} analyzerOpts analyzer options
 * @param {StatsCompilation} bundleStats bundle stats
 * @param {string | null} bundleDir bundle dir
 * @returns {ChartData | null} chart data
 */
function getChartData(analyzerOpts, bundleStats, bundleDir) {
  /** @type {ChartData | undefined | null} */
  let chartData;
  const { logger } = analyzerOpts;

  try {
    chartData = analyzer.getViewerData(bundleStats, bundleDir, analyzerOpts);
  } catch (err) {
    logger.error(`Couldn't analyze webpack bundle:\n${err}`);
    logger.debug(/** @type {Error} */ (err).stack);
    chartData = null;
  }

  // chartData can either be an array (bundleInfo[]) or null. It can't be an plain object anyway
  if (
    // analyzer.getViewerData() doesn't failed in the previous step
    chartData &&
    !Array.isArray(chartData)
  ) {
    logger.error("Couldn't find any javascript bundles in provided stats file");
    chartData = null;
  }

  return chartData;
}

/**
 * @typedef {object} ServerOptions
 * @property {number} port port
 * @property {string} host host
 * @property {boolean} openBrowser true when need to open browser, otherwise false
 * @property {string | null} bundleDir bundle dir
 * @property {Logger} logger logger
 * @property {Sizes} defaultSizes default sizes
 * @property {CompressionAlgorithm} compressionAlgorithm compression algorithm
 * @property {ExcludeAssets | null} excludeAssets exclude assets
 * @property {ReportTitle} reportTitle report title
 * @property {AnalyzerUrl} analyzerUrl analyzer url
 */

/** @typedef {{ ws: WebSocketServer, http: Server, updateChartData: (bundleStats: StatsCompilation) => void }} ViewerServerObj */

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @param {ServerOptions} opts options
 * @returns {Promise<ViewerServerObj>} server
 */
async function startServer(bundleStats, opts) {
  const {
    port = 8888,
    host = "127.0.0.1",
    openBrowser = true,
    bundleDir = null,
    logger = new Logger(),
    defaultSizes = "parsed",
    compressionAlgorithm,
    excludeAssets = null,
    reportTitle,
    analyzerUrl,
  } = opts || {};

  const analyzerOpts = { logger, excludeAssets, compressionAlgorithm };

  let chartData = getChartData(analyzerOpts, bundleStats, bundleDir);

  if (!chartData) {
    throw new Error("Can't get chart data");
  }

  const sirvMiddleware = sirv(`${projectRoot}/public`, {
    // disables caching and traverse the file system on every request
    dev: true,
  });

  const entrypoints = getEntrypoints(bundleStats);
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
      const html = renderViewer({
        mode: "server",
        title: resolveTitle(reportTitle),
        chartData: /** @type {ChartData} */ (chartData),
        entrypoints,
        defaultSizes: resolveDefaultSizes(defaultSizes, compressionAlgorithm),
        compressionAlgorithm,
        enableWebSocket: true,
      });
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } else {
      sirvMiddleware(req, res);
    }
  });

  await new Promise(
    /**
     * @param {(value: void) => void} resolve resolve
     */
    (resolve) => {
      server.listen(port, host, () => {
        resolve();

        const url = analyzerUrl({
          listenPort: port,
          listenHost: host,
          boundAddress: server.address(),
        });

        logger.info(
          `${bold("Webpack Bundle Analyzer")} is started at ${bold(url)}\n` +
            `Use ${bold("Ctrl+C")} to close it`,
        );

        if (openBrowser) {
          open(url, logger);
        }
      });
    },
  );

  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    ws.on("error", (err) => {
      // Ignore network errors like `ECONNRESET`, `EPIPE`, etc.
      if (/** @type {NodeJS.ErrnoException} */ (err).errno) return;

      logger.info(err.message);
    });
  });

  /**
   * @param {StatsCompilation} bundleStats bundle stats
   */
  function updateChartData(bundleStats) {
    const newChartData = getChartData(analyzerOpts, bundleStats, bundleDir);

    if (!newChartData) return;

    chartData = newChartData;

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event: "chartDataUpdated",
            data: newChartData,
          }),
        );
      }
    }
  }

  return {
    ws: wss,
    http: server,
    updateChartData,
  };
}

/**
 * @typedef {object} GenerateReportOptions
 * @property {boolean} openBrowser true when need to open browser, otherwise false
 * @property {string} reportFilename report filename
 * @property {ReportTitle} reportTitle report title
 * @property {string | null} bundleDir bundle dir
 * @property {Logger} logger logger
 * @property {Sizes} defaultSizes default sizes
 * @property {CompressionAlgorithm} compressionAlgorithm compression algorithm
 * @property {ExcludeAssets} excludeAssets exclude assets
 */

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @param {GenerateReportOptions} opts opts
 * @returns {Promise<void>}
 */
async function generateReport(bundleStats, opts) {
  const {
    openBrowser = true,
    reportFilename,
    reportTitle,
    bundleDir = null,
    logger = new Logger(),
    defaultSizes = "parsed",
    compressionAlgorithm,
    excludeAssets = null,
  } = opts || {};

  const chartData = getChartData(
    { logger, excludeAssets, compressionAlgorithm },
    bundleStats,
    bundleDir,
  );
  const entrypoints = getEntrypoints(bundleStats);

  if (!chartData) return;

  const reportHtml = renderViewer({
    mode: "static",
    title: resolveTitle(reportTitle),
    chartData,
    entrypoints,
    defaultSizes: resolveDefaultSizes(defaultSizes, compressionAlgorithm),
    compressionAlgorithm,
    enableWebSocket: false,
  });
  const reportFilepath = path.resolve(
    bundleDir || process.cwd(),
    reportFilename,
  );

  fs.mkdirSync(path.dirname(reportFilepath), { recursive: true });
  fs.writeFileSync(reportFilepath, reportHtml);

  logger.info(
    `${bold("Webpack Bundle Analyzer")} saved report to ${bold(reportFilepath)}`,
  );

  if (openBrowser) {
    open(`file://${reportFilepath}`, logger);
  }
}

/**
 * @typedef {object} GenerateJSONReportOptions
 * @property {string} reportFilename report filename
 * @property {string | null} bundleDir bundle dir
 * @property {Logger} logger logger
 * @property {ExcludeAssets} excludeAssets exclude assets
 * @property {CompressionAlgorithm} compressionAlgorithm compression algorithm
 */

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @param {GenerateJSONReportOptions} opts options
 * @returns {Promise<void>}
 */
async function generateJSONReport(bundleStats, opts) {
  const {
    reportFilename,
    bundleDir = null,
    logger = new Logger(),
    excludeAssets = null,
    compressionAlgorithm,
  } = opts || {};

  const chartData = getChartData(
    { logger, excludeAssets, compressionAlgorithm },
    bundleStats,
    bundleDir,
  );

  if (!chartData) return;

  await fs.promises.mkdir(path.dirname(reportFilename), { recursive: true });
  await fs.promises.writeFile(reportFilename, JSON.stringify(chartData));

  logger.info(
    `${bold("Webpack Bundle Analyzer")} saved JSON report to ${bold(reportFilename)}`,
  );
}

module.exports = {
  generateJSONReport,
  generateReport,
  getEntrypoints,
  // deprecated
  start: startServer,
  startServer,
};
