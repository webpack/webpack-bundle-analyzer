const fs = require("node:fs");
const path = require("node:path");
const { bold } = require("picocolors");

const Logger = require("./Logger");
const { writeStats } = require("./statsUtils");
const utils = require("./utils");
const viewer = require("./viewer");

/** @typedef {import("net").AddressInfo} AddressInfo */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").OutputFileSystem} OutputFileSystem */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").StatsOptions} StatsOptions */
/** @typedef {import("webpack").StatsAsset} StatsAsset */
/** @typedef {import("webpack").StatsCompilation} StatsCompilation */
/** @typedef {import("./sizeUtils").Algorithm} CompressionAlgorithm */
/** @typedef {import("./Logger").Level} LogLever */
/** @typedef {import("./viewer").ViewerServerObj} ViewerServerObj */

/** @typedef {string | boolean | StatsOptions} PluginStatsOptions */

// eslint-disable-next-line jsdoc/reject-any-type
/** @typedef {any} EXPECTED_ANY */

/** @typedef {"static" | "json" | "server" | "disabled"} Mode */
/** @typedef {string | RegExp | ((asset: string) => void)} Pattern */
/** @typedef {null | Pattern | Pattern[]} ExcludeAssets */
/** @typedef {"stat" | "parsed" | "gzip" | "brotli" | "zstd"} Sizes */
/** @typedef {string | (() => string)} ReportTitle */
/** @typedef {(options: { listenHost: string, listenPort: number, boundAddress: string | AddressInfo | null }) => string} AnalyzerUrl */

/**
 * @typedef {object} Options
 * @property {Mode=} analyzerMode analyzer mode
 * @property {string=} analyzerHost analyzer host
 * @property {"auto" | number=} analyzerPort analyzer port
 * @property {CompressionAlgorithm=} compressionAlgorithm compression algorithm
 * @property {string | null=} reportFilename report filename
 * @property {ReportTitle=} reportTitle report title
 * @property {Sizes=} defaultSizes default sizes
 * @property {boolean=} openAnalyzer open analyzer
 * @property {boolean=} generateStatsFile generate stats file
 * @property {string=} statsFilename stats filename
 * @property {PluginStatsOptions=} statsOptions stats options
 * @property {ExcludeAssets=} excludeAssets exclude assets
 * @property {LogLever=} logLevel exclude assets
 * @property {boolean=} startAnalyzer start analyzer
 * @property {AnalyzerUrl=} analyzerUrl start analyzer
 */

class BundleAnalyzerPlugin {
  /**
   * @param {Options=} opts options
   */
  constructor(opts = {}) {
    /** @type {Required<Omit<Options, "analyzerPort" | "statsOptions">> & { analyzerPort: number, statsOptions: undefined | PluginStatsOptions }} */
    this.opts = {
      analyzerMode: "server",
      analyzerHost: "127.0.0.1",
      compressionAlgorithm: "gzip",
      reportFilename: null,
      reportTitle: utils.defaultTitle,
      defaultSizes: "parsed",
      openAnalyzer: true,
      generateStatsFile: false,
      statsFilename: "stats.json",
      statsOptions: undefined,
      excludeAssets: null,
      logLevel: "info",
      // TODO deprecated
      startAnalyzer: true,
      analyzerUrl: utils.defaultAnalyzerUrl,
      ...opts,
      analyzerPort:
        opts.analyzerPort === "auto" ? 0 : (opts.analyzerPort ?? 8888),
    };

    /** @type {Compiler | null} */
    this.compiler = null;
    /** @type {Promise<ViewerServerObj> | null} */
    this.server = null;
    this.logger = new Logger(this.opts.logLevel);
  }

  /**
   * @param {Compiler} compiler compiler
   */
  apply(compiler) {
    this.compiler = compiler;

    /**
     * @param {Stats} stats stats
     * @param {(err?: Error) => void} callback callback
     */
    const done = (stats, callback) => {
      callback ||= () => {};

      /** @type {(() => Promise<void>)[]} */
      const actions = [];

      if (this.opts.generateStatsFile) {
        actions.push(() =>
          this.generateStatsFile(stats.toJson(this.opts.statsOptions)),
        );
      }

      // Handling deprecated `startAnalyzer` flag
      if (this.opts.analyzerMode === "server" && !this.opts.startAnalyzer) {
        this.opts.analyzerMode = "disabled";
      }

      if (this.opts.analyzerMode === "server") {
        actions.push(() => this.startAnalyzerServer(stats.toJson()));
      } else if (this.opts.analyzerMode === "static") {
        actions.push(() => this.generateStaticReport(stats.toJson()));
      } else if (this.opts.analyzerMode === "json") {
        actions.push(() => this.generateJSONReport(stats.toJson()));
      }

      if (actions.length) {
        // Making analyzer logs to be after all webpack logs in the console
        setImmediate(async () => {
          try {
            await Promise.all(actions.map((action) => action()));
            callback();
          } catch (err) {
            callback(/** @type {Error} */ (err));
          }
        });
      } else {
        callback();
      }
    };

    if (compiler.hooks) {
      compiler.hooks.done.tapAsync("webpack-bundle-analyzer", done);
    } else {
      // @ts-expect-error old webpack@4 API
      compiler.plugin("done", done);
    }
  }

  /**
   * @param {StatsCompilation} stats stats
   * @returns {Promise<void>}
   */
  async generateStatsFile(stats) {
    const statsFilepath = path.resolve(
      /** @type {Compiler} */
      (this.compiler).outputPath,
      this.opts.statsFilename,
    );
    await fs.promises.mkdir(path.dirname(statsFilepath), { recursive: true });

    try {
      await writeStats(stats, statsFilepath);

      this.logger.info(
        `${bold("Webpack Bundle Analyzer")} saved stats file to ${bold(statsFilepath)}`,
      );
    } catch (error) {
      this.logger.error(
        `${bold("Webpack Bundle Analyzer")} error saving stats file to ${bold(statsFilepath)}: ${error}`,
      );
    }
  }

  /**
   * @param {StatsCompilation} stats stats
   * @returns {Promise<void>}
   */
  async startAnalyzerServer(stats) {
    if (this.server) {
      (await this.server).updateChartData(stats);
    } else {
      this.server = viewer.startServer(stats, {
        openBrowser: this.opts.openAnalyzer,
        host: this.opts.analyzerHost,
        port: this.opts.analyzerPort,
        reportTitle: this.opts.reportTitle,
        compressionAlgorithm: this.opts.compressionAlgorithm,
        bundleDir: this.getBundleDirFromCompiler(),
        logger: this.logger,
        defaultSizes: this.opts.defaultSizes,
        excludeAssets: this.opts.excludeAssets,
        analyzerUrl: this.opts.analyzerUrl,
      });
    }
  }

  /**
   * @param {StatsCompilation} stats stats
   * @returns {Promise<void>}
   */
  async generateJSONReport(stats) {
    await viewer.generateJSONReport(stats, {
      reportFilename: path.resolve(
        /** @type {Compiler} */
        (this.compiler).outputPath,
        this.opts.reportFilename || "report.json",
      ),
      compressionAlgorithm: this.opts.compressionAlgorithm,
      bundleDir: this.getBundleDirFromCompiler(),
      logger: this.logger,
      excludeAssets: this.opts.excludeAssets,
    });
  }

  /**
   * @param {StatsCompilation} stats stats
   * @returns {Promise<void>}
   */
  async generateStaticReport(stats) {
    await viewer.generateReport(stats, {
      openBrowser: this.opts.openAnalyzer,
      reportFilename: path.resolve(
        /** @type {Compiler} */
        (this.compiler).outputPath,
        this.opts.reportFilename || "report.html",
      ),
      reportTitle: this.opts.reportTitle,
      compressionAlgorithm: this.opts.compressionAlgorithm,
      bundleDir: this.getBundleDirFromCompiler(),
      logger: this.logger,
      defaultSizes: this.opts.defaultSizes,
      excludeAssets: this.opts.excludeAssets,
    });
  }

  getBundleDirFromCompiler() {
    const outputFileSystemConstructor =
      /** @type {OutputFileSystem} */
      (/** @type {Compiler} */ (this.compiler).outputFileSystem).constructor;

    if (typeof outputFileSystemConstructor === "undefined") {
      return /** @type {Compiler} */ (this.compiler).outputPath;
    }
    switch (outputFileSystemConstructor.name) {
      case "MemoryFileSystem":
        return null;
      // Detect AsyncMFS used by Nuxt 2.5 that replaces webpack's MFS during development
      // Related: #274
      case "AsyncMFS":
        return null;
      default:
        return /** @type {Compiler} */ (this.compiler).outputPath;
    }
  }
}

module.exports = BundleAnalyzerPlugin;
