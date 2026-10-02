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

  it("handles child compilations with missing or undefined assets without throwing", () => {
    const stats = {
      children: [
        {
          name: "child-with-assets",
          assets: [
            {
              name: "child-bundle.js",
              size: 100,
              chunks: [1],
            },
          ],
          chunks: [
            {
              id: 1,
              modules: [
                {
                  id: 1,
                  identifier: "./child-mod.js",
                  name: "./child-mod.js",
                  size: 50,
                  chunks: [1],
                },
              ],
            },
          ],
        },
        {
          name: "child-without-assets",
          // assets is undefined (e.g. logging/internal child compilation)
        },
      ],
    };

    expect(() => getViewerData(stats)).not.toThrow();
    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(1);
    expect(chartData[0].label).toBe("child-bundle.js");
  });

  it("handles when the first child compilation has undefined assets", () => {
    const stats = {
      children: [
        {
          name: "child-without-assets",
          // assets is undefined
        },
        {
          name: "child-with-assets",
          assets: [
            {
              name: "child-bundle.js",
              size: 100,
              chunks: [1],
            },
          ],
          chunks: [
            {
              id: 1,
              modules: [
                {
                  id: 1,
                  identifier: "./child-mod.js",
                  name: "./child-mod.js",
                  size: 50,
                  chunks: [1],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => getViewerData(stats)).not.toThrow();
    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(1);
    expect(chartData[0].label).toBe("child-bundle.js");
  });

  it("handles stats provided as an array of compilations", () => {
    const stats = [
      {
        assets: [
          {
            name: "first.js",
            size: 100,
            chunks: [1],
          },
        ],
        entrypoints: {
          firstEntry: {
            name: "firstEntry",
            assets: [{ name: "first.js" }],
          },
        },
        chunks: [
          {
            id: 1,
            modules: [
              {
                id: 1,
                identifier: "./first.js",
                name: "./first.js",
                size: 50,
                chunks: [1],
              },
            ],
          },
        ],
      },
      {
        assets: [
          {
            name: "second.js",
            size: 200,
            chunks: [2],
          },
        ],
        entrypoints: {
          secondEntry: {
            name: "secondEntry",
            assets: [{ name: "second.js" }],
          },
        },
        chunks: [
          {
            id: 2,
            modules: [
              {
                id: 2,
                identifier: "./second.js",
                name: "./second.js",
                size: 80,
                chunks: [2],
              },
            ],
          },
        ],
      },
    ];

    expect(() => getViewerData(stats)).not.toThrow();
    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(2);
    expect(chartData[0].label).toBe("first.js");
    expect(chartData[0].isInitialByEntrypoint).toEqual({ firstEntry: true });
    expect(chartData[1].label).toBe("second.js");
    expect(chartData[1].isInitialByEntrypoint).toEqual({ secondEntry: true });
  });

  it("maps modules for child compilation assets correctly", () => {
    const stats = {
      children: [
        {
          name: "client",
          assets: [
            {
              name: "client.js",
              size: 100,
              chunks: [1],
            },
          ],
          chunks: [
            {
              id: 1,
              modules: [
                {
                  id: 1,
                  identifier: "./client-module.js",
                  name: "./client-module.js",
                  size: 50,
                  chunks: [1],
                },
              ],
            },
          ],
        },
        {
          name: "server",
          assets: [
            {
              name: "server.js",
              size: 200,
              chunks: [2],
            },
          ],
          chunks: [
            {
              id: 2,
              modules: [
                {
                  id: 2,
                  identifier: "./server-module.js",
                  name: "./server-module.js",
                  size: 80,
                  chunks: [2],
                },
              ],
            },
          ],
        },
      ],
    };

    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(2);
    expect(chartData[0].label).toBe("client.js");
    expect(chartData[0].groups).toHaveLength(1);
    expect(chartData[1].label).toBe("server.js");
    expect(chartData[1].groups).toHaveLength(1);
  });

  it("handles string entrypoint assets from Webpack 4", () => {
    const stats = {
      assets: [
        {
          name: "legacy.js",
          size: 100,
          chunks: [1],
        },
      ],
      chunks: [
        {
          id: 1,
          modules: [
            {
              id: 1,
              identifier: "./legacy.js",
              name: "./legacy.js",
              size: 50,
              chunks: [1],
            },
          ],
        },
      ],
      entrypoints: {
        main: {
          name: "main",
          assets: ["legacy.js"],
        },
      },
    };

    const chartData = getViewerData(stats);
    expect(chartData[0].isInitialByEntrypoint).toEqual({ main: true });
  });

  it("handles entrypoint assets with empty or null items", () => {
    const stats = {
      assets: [
        {
          name: "bundle.js",
          size: 100,
          chunks: [1],
        },
      ],
      chunks: [
        {
          id: 1,
          modules: [
            {
              id: 1,
              identifier: "./bundle.js",
              name: "./bundle.js",
              size: 50,
              chunks: [1],
            },
          ],
        },
      ],
      entrypoints: {
        main: {
          name: "main",
          assets: [null, { name: "" }, "bundle.js"],
        },
      },
    };

    const chartData = getViewerData(stats);
    expect(chartData[0].isInitialByEntrypoint).toEqual({ main: true });
  });

  it("handles null or undefined entries in children array", () => {
    const stats = {
      children: [
        null,
        {
          name: "child",
          assets: [
            {
              name: "bundle.js",
              size: 100,
              chunks: [1],
            },
          ],
          chunks: [
            {
              id: 1,
              modules: [
                {
                  id: 1,
                  identifier: "./bundle.js",
                  name: "./bundle.js",
                  size: 50,
                  chunks: [1],
                },
              ],
            },
          ],
        },
      ],
    };

    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(1);
    expect(chartData[0].label).toBe("bundle.js");
  });

  it("resolves pre-marked isChild assets via getChildAssetBundles fallback", () => {
    const stats = {
      assets: [
        {
          name: "fallback.js",
          size: 100,
          chunks: [1],
          isChild: true,
        },
      ],
      children: [
        null,
        {
          name: "empty-child",
          assets: [],
          // no assetsByChunkName to exercise empty fallback
        },
        {
          name: "child",
          assets: [
            {
              name: "fallback.js",
              size: 100,
              chunks: [1],
            },
          ],
          chunks: [
            {
              id: 1,
              modules: [
                {
                  id: 1,
                  identifier: "./fallback-module.js",
                  name: "./fallback-module.js",
                  size: 50,
                  chunks: [1],
                },
              ],
            },
          ],
        },
      ],
    };

    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(1);
    expect(chartData[0].label).toBe("fallback.js");
    expect(chartData[0].groups[0].label).toBe("fallback-module.js");
  });

  it("handles null or undefined bundleStats gracefully", () => {
    expect(getViewerData(null)).toEqual([]);
    expect(getViewerData(undefined)).toEqual([]);
  });

  it("resolves child assets by assetsByChunkName when assets array is not present", () => {
    const stats = {
      assets: [
        {
          name: "chunk-asset.js",
          size: 100,
          chunks: [1],
          isChild: true,
        },
      ],
      children: [
        {
          name: "legacy-child",
          assetsByChunkName: {
            main: ["chunk-asset.js"],
          },
          chunks: [
            {
              id: 1,
              modules: [
                {
                  id: 1,
                  identifier: "./chunk-mod.js",
                  name: "./chunk-mod.js",
                  size: 50,
                  chunks: [1],
                },
              ],
            },
          ],
        },
      ],
    };

    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(1);
    expect(chartData[0].label).toBe("chunk-asset.js");
    expect(chartData[0].groups[0].label).toBe("chunk-mod.js");
  });

  it("preserves entrypoints for both root and child compilations when root also has assets", () => {
    const stats = {
      assets: [
        {
          name: "root.js",
          size: 100,
          chunks: [1],
        },
        {
          name: "unmatched-child.js",
          size: 50,
          chunks: [99],
          isChild: true,
        },
      ],
      entrypoints: {
        rootEntry: {
          name: "rootEntry",
          assets: [{ name: "root.js" }],
        },
      },
      chunks: [
        {
          id: 1,
          modules: [
            {
              id: 1,
              identifier: "./root.js",
              name: "./root.js",
              size: 50,
              chunks: [1],
            },
          ],
        },
      ],
      children: [
        {
          name: "worker-child",
          assets: [
            {
              name: "worker.js",
              size: 150,
              chunks: [2],
            },
          ],
          entrypoints: {
            workerEntry: {
              name: "workerEntry",
              assets: [{ name: "worker.js" }],
            },
          },
          chunks: [
            {
              id: 2,
              modules: [
                {
                  id: 2,
                  identifier: "./worker.js",
                  name: "./worker.js",
                  size: 75,
                  chunks: [2],
                },
              ],
            },
          ],
        },
      ],
    };

    const chartData = getViewerData(stats);
    expect(chartData).toHaveLength(3);
    expect(chartData[0].label).toBe("root.js");
    expect(chartData[0].isInitialByEntrypoint).toEqual({ rootEntry: true });
    expect(chartData[1].label).toBe("unmatched-child.js");
    expect(chartData[1].isInitialByEntrypoint).toEqual({});
    expect(chartData[2].label).toBe("worker.js");
    expect(chartData[2].isInitialByEntrypoint).toEqual({ workerEntry: true });
  });
});
