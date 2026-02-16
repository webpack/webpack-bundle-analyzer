const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");
const puppeteer = require("puppeteer");
const BundleAnalyzerPlugin = require("../src/BundleAnalyzerPlugin");
const { isZstdSupported } = require("../src/sizeUtils");
const {
  forEachWebpackVersion,
  makeWebpackConfig,
  webpackCompile,
} = require("./helpers");

function getChartDataFromJSONReport(reportFilename = "report.json") {
  return require(path.resolve(__dirname, `output/${reportFilename}`));
}

describe("Plugin options", () => {
  describe("options", () => {
    it("should be optional", () => {
      expect(() => new BundleAnalyzerPlugin()).not.toThrow();
    });
  });
});

describe("Plugin", () => {
  let browser;

  async function getTitleFromReport(reportFilename = "report.html") {
    const page = await browser.newPage();
    await page.goto(
      url.pathToFileURL(path.resolve(__dirname, `./output/${reportFilename}`)),
    );
    return await page.title();
  }

  async function getChartDataFromReport(reportFilename = "report.html") {
    const page = await browser.newPage();
    await page.goto(
      url.pathToFileURL(path.resolve(__dirname, `./output/${reportFilename}`)),
    );
    return await page.evaluate(() => globalThis.chartData);
  }

  async function expectValidReport(opts) {
    const {
      bundleFilename = "bundle.js",
      reportFilename = "report.html",
      bundleLabel = "bundle.js",
      statSize = 141,
      parsedSize = 2821,
      gzipSize,
    } = { gzipSize: 770, ...opts };

    expect(
      fs.existsSync(path.resolve(__dirname, `./output/${bundleFilename}`)),
    ).toBe(true);
    expect(
      fs.existsSync(path.resolve(__dirname, `./output/${reportFilename}`)),
    ).toBe(true);
    const chartData = await getChartDataFromReport(reportFilename);

    const expected = {
      label: bundleLabel,
      statSize,
      parsedSize,
    };

    if (typeof gzipSize !== "undefined") {
      expected.gzipSize = gzipSize;
    }

    if (typeof opts.brotliSize !== "undefined") {
      expected.brotliSize = opts.brotliSize;
    }

    if (typeof opts.zstdSize !== "undefined") {
      expected.zstdSize = opts.zstdSize;
    }

    expect(chartData[0]).toMatchObject(expected);
  }

  beforeEach(async () => {
    browser = await puppeteer.launch();
    await fs.promises.rm(path.resolve(__dirname, "./output"), {
      force: true,
      recursive: true,
    });
  });

  afterEach(async () => {
    await browser.close();
    await fs.promises.rm(path.resolve(__dirname, "./output"), {
      force: true,
      recursive: true,
    });
  });

  forEachWebpackVersion(["4.44.2"], ({ it, webpackCompile }) => {
    // Webpack 5 doesn't support `jsonpFunction` option
    it("should support webpack config with custom `jsonpFunction` name", async () => {
      const config = makeWebpackConfig({
        multipleChunks: true,
      });

      config.output.jsonpFunction = "somethingCompletelyDifferent";

      await webpackCompile(config);

      await expectValidReport({
        parsedSize: 1349,
        gzipSize: 358,
      });
    });
  });

  /* eslint jest/no-standalone-expect: ["error", { additionalTestBlockFunctions: ["forEachWebpackVersion"] }] */
  forEachWebpackVersion(({ it, webpackCompile }) => {
    it("should allow to generate json report", async () => {
      const config = makeWebpackConfig({
        analyzerOpts: {
          analyzerMode: "json",
        },
      });

      await webpackCompile(config);

      const chartData = await getChartDataFromJSONReport();
      expect(chartData).toBeDefined();
    });

    it("should support webpack config with `multi` module", async () => {
      const config = makeWebpackConfig();

      config.entry.bundle = ["./src/a.js", "./src/b.js"];

      await webpackCompile(config);

      const chartData = await getChartDataFromReport();
      const bundleGroup = chartData.find(
        (group) => group.label === "bundle.js",
      );

      expect(bundleGroup.groups).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "src",
            path: "./src",
            groups: expect.arrayContaining([
              expect.objectContaining({
                label: "a.js",
                path: "./src/a.js",
              }),
              expect.objectContaining({
                label: "b.js",
                path: "./src/b.js",
              }),
            ]),
          }),
        ]),
      );
    });
  });

  describe("options", () => {
    describe("excludeAssets", () => {
      forEachWebpackVersion(({ it, webpackCompile }) => {
        it("should filter out assets from the report", async () => {
          const config = makeWebpackConfig({
            multipleChunks: true,
            analyzerOpts: {
              excludeAssets: "manifest",
            },
          });

          await webpackCompile(config);

          const chartData = await getChartDataFromReport();
          expect(chartData.map((i) => i.label)).toEqual(["bundle.js"]);
        });
      });
    });

    describe("reportTitle", () => {
      it("should have a sensible default", async () => {
        const config = makeWebpackConfig();
        await webpackCompile(config, "4.44.2");
        const generatedReportTitle = await getTitleFromReport();
        expect(generatedReportTitle).toMatch(
          /^webpack-bundle-analyzer \[.* at \d{2}:\d{2}\]/u,
        );
      });

      it("should support a string value", async () => {
        const reportTitle = "A string report title";
        const config = makeWebpackConfig({
          analyzerOpts: {
            reportTitle,
          },
        });
        await webpackCompile(config, "4.44.2");
        const generatedReportTitle = await getTitleFromReport();
        expect(generatedReportTitle).toBe(reportTitle);
      });

      it("should support a function value", async () => {
        const reportTitleResult = "A string report title";
        const config = makeWebpackConfig({
          analyzerOpts: {
            reportTitle: () => reportTitleResult,
          },
        });
        await webpackCompile(config, "4.44.2");
        const generatedReportTitle = await getTitleFromReport();
        expect(generatedReportTitle).toBe(reportTitleResult);
      });

      it("should propagate an error in a function", async () => {
        const reportTitleError = new Error("test");
        const config = makeWebpackConfig({
          analyzerOpts: {
            reportTitle: () => {
              throw reportTitleError;
            },
          },
        });

        let error = null;
        try {
          await webpackCompile(config, "4.44.2");
        } catch (err) {
          error = err;
        }

        expect(error).toBe(reportTitleError);
      });
    });

    describe("compressionAlgorithm", () => {
      it("should default to gzip", async () => {
        const config = makeWebpackConfig({ analyzerOpts: {} });
        await webpackCompile(config, "4.44.2");
        await expectValidReport({ parsedSize: 1317, gzipSize: 341 });
      });

      it("should support gzip", async () => {
        const config = makeWebpackConfig({
          analyzerOpts: { compressionAlgorithm: "gzip" },
        });
        await webpackCompile(config, "4.44.2");
        await expectValidReport({ parsedSize: 1317, gzipSize: 341 });
      });

      it("should support brotli", async () => {
        const config = makeWebpackConfig({
          analyzerOpts: { compressionAlgorithm: "brotli" },
        });
        await webpackCompile(config, "4.44.2");
        await expectValidReport({
          gzipSize: undefined,
          parsedSize: 1317,
          brotliSize: 295,
        });
      });

      if (isZstdSupported) {
        it("should support zstd", async () => {
          const config = makeWebpackConfig({
            analyzerOpts: { compressionAlgorithm: "zstd" },
          });
          await webpackCompile(config, "4.44.2");
          await expectValidReport({
            parsedSize: 1317,
            gzipSize: undefined,
            brotliSize: undefined,
            zstdSize: 345,
          });
        });
      }
    });
  });
});
