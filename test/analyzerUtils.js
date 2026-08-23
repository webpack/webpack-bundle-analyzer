const fs = require("node:fs");
const path = require("node:path");

const { getViewerData } = require("../src/analyzer");
const { getCompressedSize } = require("../src/sizeUtils");

const BUNDLES_DIR = path.resolve(__dirname, "./bundles");

describe("getViewerData", () => {
  it("passes asset module ids when parsing competing Webpack 5 IIFEs", () => {
    const bundleName = "webpack5UmdBundleWithDecoyIIFE";
    const bundleFilename = `${bundleName}.js`;
    const expectedModules = JSON.parse(
      fs.readFileSync(`${BUNDLES_DIR}/${bundleName}.modules.json`),
    ).modules;
    const dependencyModule = {
      id: 447,
      identifier: "./src/dependency.js",
      name: "./src/dependency.js",
      size: 40,
      chunks: [1],
      depth: 1,
    };
    const entryModule = {
      id: 956,
      identifier: "./src/entry.js",
      name: "./src/entry.js",
      size: 80,
      chunks: [1],
      depth: 0,
    };
    const moduleWithoutId = {
      identifier: "./src/no-id.js",
      name: "./src/no-id.js",
      size: 20,
      chunks: [1],
      depth: 1,
    };
    let chunksAccessCount = 0;
    const chunks = [
      {
        id: 1,
        modules: [dependencyModule, entryModule, moduleWithoutId],
      },
    ];
    const stats = {
      assets: [
        {
          type: "asset",
          name: bundleFilename,
          size: fs.statSync(`${BUNDLES_DIR}/${bundleFilename}`).size,
          info: {
            javascriptModule: false,
          },
          chunks: [1],
        },
        {
          type: "asset",
          name: "validWebpack5UmdBundle.js",
          size: fs.statSync(`${BUNDLES_DIR}/validWebpack5UmdBundle.js`).size,
          info: {
            javascriptModule: false,
          },
          chunks: [2],
          isChild: true,
        },
      ],
      get chunks() {
        chunksAccessCount++;
        return chunks;
      },
      entrypoints: {
        main: {
          name: "main",
          assets: [{ name: bundleFilename }],
        },
      },
    };

    const chartData = getViewerData(stats, BUNDLES_DIR);
    const modulesByPath = Object.fromEntries(
      chartData[0].groups[0].groups.map((group) => [group.path, group]),
    );

    // Asserting on the returned chart data rather than on the input stats objects, because
    // `getViewerData` copies the modules of every asset before attributing parsed sources to them.
    // Module `parsedSize` is the source length, and the gzip size pins the source itself.
    expect(modulesByPath["./src/dependency.js"]).toMatchObject({
      parsedSize: expectedModules[447].length,
      gzipSize: getCompressedSize("gzip", expectedModules[447]),
    });
    expect(modulesByPath["./src/entry.js"]).toMatchObject({
      parsedSize: expectedModules[956].length,
      gzipSize: getCompressedSize("gzip", expectedModules[956]),
    });
    expect(chunksAccessCount).toBe(1);
  });
});
