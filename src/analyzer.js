const fs = require("node:fs");
const path = require("node:path");

const { parseChunked } = require("@discoveryjs/json-ext");

const Logger = require("./Logger");
const { parseBundle } = require("./parseUtils");
const { getCompressedSize } = require("./sizeUtils");
const Folder = require("./tree/Folder").default;
const { createAssetsFilter } = require("./utils");

const FILENAME_QUERY_REGEXP = /\?.*$/u;
const FILENAME_EXTENSIONS = /\.(js|mjs|cjs|bundle)$/iu;

/** @typedef {import("webpack").StatsCompilation} StatsCompilation */
/** @typedef {import("webpack").StatsModule} StatsModule */
/** @typedef {import("webpack").StatsAsset} StatsAsset */
/** @typedef {import("./BundleAnalyzerPlugin").CompressionAlgorithm} CompressionAlgorithm */
/** @typedef {import("./BundleAnalyzerPlugin").ExcludeAssets} ExcludeAssets */

/**
 * @typedef {object} AnalyzerOptions
 * @property {"gzip" | "brotli" | "zstd"} compressionAlgorithm compression algorithm
 */

/**
 * @param {StatsModule[]} modules modules
 * @param {AnalyzerOptions} options options
 * @returns {Folder} a folder class
 */
function createModulesTree(modules, options) {
  const root = new Folder(".", options);

  for (const module of modules) {
    root.addModule(module);
  }

  root.mergeNestedFolders();

  return root;
}

/**
 * arr-flatten <https://github.com/jonschlinkert/arr-flatten>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 *
 * Modified by Sukka <https://skk.moe>
 *
 * Replace recursively flatten with one-level deep flatten to match lodash.flatten
 *
 * TODO: replace with Array.prototype.flat once Node.js 10 support is dropped
 */
/**
 * Flattens an array by one level.
 * @template T
 * @param {(T | T[])[]} arr the array to flatten
 * @returns {T[]} a new array containing the flattened elements
 */
function flatten(arr) {
  if (!arr) return [];
  const len = arr.length;
  if (!len) return [];

  let cur;

  const res = [];
  for (let i = 0; i < len; i++) {
    cur = arr[i];
    if (Array.isArray(cur)) {
      res.push(...cur);
    } else {
      res.push(cur);
    }
  }
  return res;
}

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @param {string} assetName asset name
 * @returns {boolean} child asset bundlers
 */
function getChildAssetBundles(bundleStats, assetName) {
  return flatten(
    (bundleStats.children || /** @type {StatsCompilation} */ ([])).find(
      /**
       * @param {StatsCompilation} child child stats
       * @returns {string[][]} assets by chunk name
       */
      (child) => Object.values(child.assetsByChunkName || []),
    ),
  ).includes(assetName);
}

/**
 * @param {StatsAsset} statsAsset stats asset
 * @param {StatsModule} statsModule stats modules
 * @returns {boolean} true when asset has a module
 */
function assetHasModule(statsAsset, statsModule) {
  // Checking if this module is the part of asset chunks
  return (statsModule.chunks || []).some(
    (moduleChunk) =>
      statsAsset.chunks && statsAsset.chunks.includes(moduleChunk),
  );
}

/**
 * @param {StatsModule} statsModule stats Module
 * @returns {boolean} true when runtime modules, otherwise false
 */
function isRuntimeModule(statsModule) {
  return statsModule.moduleType === "runtime";
}

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @returns {StatsModule[]} modules
 */
function getBundleModules(bundleStats) {
  /** @type {Set<string | number>} */
  const seenIds = new Set();
  const modules = /** @type {StatsModule[]} */ ([
    ...(bundleStats.chunks?.map((chunk) => chunk.modules) || []),
    ...(bundleStats.modules || []),
  ]).filter(Boolean);

  return flatten(modules).filter((mod) => {
    // Filtering out Webpack's runtime modules as they don't have ids and can't be parsed (introduced in Webpack 5)
    if (isRuntimeModule(mod)) {
      return false;
    }

    if (seenIds.has(mod.id)) {
      return false;
    }

    seenIds.add(mod.id);

    return true;
  });
}

/** @typedef {Record<string, Record<string, boolean>>} ChunkToInitialByEntrypoint */

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @returns {ChunkToInitialByEntrypoint} chunk to initial by entrypoint
 */
function getChunkToInitialByEntrypoint(bundleStats) {
  if (bundleStats === null || bundleStats === undefined) {
    return {};
  }
  /** @type {ChunkToInitialByEntrypoint} */
  const chunkToEntrypointInititalMap = {};
  for (const entrypoint of Object.values(bundleStats.entrypoints || {})) {
    for (const asset of entrypoint.assets || []) {
      chunkToEntrypointInititalMap[asset.name] ??= {};
      chunkToEntrypointInititalMap[asset.name][
        /** @type {string} */
        (entrypoint.name)
      ] = true;
    }
  }
  return chunkToEntrypointInititalMap;
}

/**
 * @param {StatsModule} statsModule stats modules
 * @returns {boolean} true when entry module, otherwise false
 */
function isEntryModule(statsModule) {
  return statsModule.depth === 0;
}

/**
 * @typedef {object} ViewerDataOptions
 * @property {Logger} logger logger
 * @property {CompressionAlgorithm} compressionAlgorithm compression algorithm
 * @property {ExcludeAssets} excludeAssets exclude assets
 */

/** @typedef {import("./tree/Module").ModuleChartData} ModuleChartData */
/** @typedef {import("./tree/ContentModule").ContentModuleChartData} ContentModuleChartData */
/** @typedef {import("./tree/ConcatenatedModule").ConcatenatedModuleChartData} ConcatenatedModuleChartData */
/** @typedef {import("./tree/ContentFolder").ContentFolderChartData} ContentFolderChartData */
/** @typedef {import("./tree/Folder").FolderChartData} FolderChartData */

/**
 * @typedef {object} ChartDataItem
 * @property {string} label label
 * @property {true} isAsset true when is asset, otherwise false
 * @property {number} statSize stat size
 * @property {number | undefined} parsedSize stat size
 * @property {number | undefined} gzipSize gzip size
 * @property {number | undefined} brotliSize brotli size
 * @property {number | undefined} zstdSize zstd size
 * @property {(ModuleChartData | ContentModuleChartData | ConcatenatedModuleChartData | ContentFolderChartData | FolderChartData)[]} groups groups
 * @property {Record<string, boolean>} isInitialByEntrypoint record with initial entrypoints
 */

/**
 * @typedef {ChartDataItem[]} ChartData
 */

/**
 * @param {StatsCompilation} bundleStats bundle stats
 * @param {string | null} bundleDir bundle dir
 * @param {ViewerDataOptions=} opts options
 * @returns {ChartData} chart data
 */
function getViewerData(bundleStats, bundleDir, opts) {
  const {
    logger = new Logger(),
    compressionAlgorithm = "gzip",
    excludeAssets = null,
  } = opts || {};

  const isAssetIncluded = createAssetsFilter(excludeAssets);

  // Sometimes all the information is located in `children` array (e.g. problem in #10)
  if (
    (bundleStats.assets === null ||
      bundleStats.assets === undefined ||
      bundleStats.assets.length === 0) &&
    bundleStats.children &&
    bundleStats.children.length > 0
  ) {
    const { children } = bundleStats;
    [bundleStats] = bundleStats.children;
    // Sometimes if there are additional child chunks produced add them as child assets,
    // leave the 1st one as that is considered the 'root' asset.
    for (let i = 1; i < children.length; i++) {
      for (const asset of children[i].assets || []) {
        asset.isChild = true;
        /** @type {StatsAsset[]} */
        (bundleStats.assets).push(asset);
      }
    }
  } else if (bundleStats.children && bundleStats.children.length > 0) {
    // Sometimes if there are additional child chunks produced add them as child assets
    for (const child of bundleStats.children) {
      for (const asset of child.assets || []) {
        asset.isChild = true;
        /** @type {StatsAsset[]} */
        (bundleStats.assets).push(asset);
      }
    }
  }

  // Picking only `*.js, *.cjs or *.mjs` assets from bundle that has non-empty `chunks` array
  bundleStats.assets = (bundleStats.assets || []).filter((asset) => {
    // Filter out non 'asset' type asset if type is provided (Webpack 5 add a type to indicate asset types)
    if (asset.type && asset.type !== "asset") {
      return false;
    }

    // Removing query part from filename (yes, somebody uses it for some reason and Webpack supports it)
    // See #22
    asset.name = asset.name.replace(FILENAME_QUERY_REGEXP, "");

    return (
      FILENAME_EXTENSIONS.test(asset.name) &&
      asset.chunks &&
      asset.chunks.length > 0 &&
      isAssetIncluded(asset.name)
    );
  });

  // Trying to parse bundle assets and get real module sizes if `bundleDir` is provided
  /** @type {Record<string, { src: string, runtimeSrc: string }> | null} */
  let bundlesSources = null;
  /** @type {Record<string | number, boolean> | null} */
  let parsedModules = null;

  if (bundleDir) {
    bundlesSources = {};
    parsedModules = {};

    for (const statAsset of bundleStats.assets) {
      const assetFile = path.join(bundleDir, statAsset.name);
      let bundleInfo;

      try {
        bundleInfo = parseBundle(assetFile, {
          sourceType: statAsset.info.javascriptModule ? "module" : "script",
        });
      } catch (err) {
        const msg =
          /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT"
            ? "no such file"
            : /** @type {Error} */ (err).message;
        logger.warn(`Error parsing bundle asset "${assetFile}": ${msg}`, {
          cause: err,
        });
        continue;
      }

      bundlesSources[statAsset.name] = {
        src: bundleInfo.src,
        runtimeSrc: bundleInfo.runtimeSrc,
      };
      Object.assign(parsedModules, bundleInfo.modules);
    }

    if (Object.keys(bundlesSources).length === 0) {
      bundlesSources = null;
      parsedModules = null;
      logger.warn(
        "\nNo bundles were parsed. Analyzer will show only original module sizes from stats file.\n",
      );
    }
  }

  /** @typedef {{ size: number, parsedSize?: number, gzipSize?: number, brotliSize?: number, zstdSize?: number, modules: StatsModule[], tree: Folder }} Asset */

  const assets = bundleStats.assets.reduce((result, statAsset) => {
    // If asset is a childAsset, then calculate appropriate bundle modules by looking through stats.children
    const assetBundles = statAsset.isChild
      ? getChildAssetBundles(bundleStats, statAsset.name)
      : bundleStats;
    /** @type {StatsModule[]} */
    const modules = assetBundles
      ? // @ts-expect-error TODO looks like we have a bug with child compilation parsing, need to add test cases
        getBundleModules(assetBundles)
      : [];
    const asset = (result[statAsset.name] = /** @type {Asset} */ ({
      size: statAsset.size,
    }));
    const assetSources =
      bundlesSources && Object.hasOwn(bundlesSources, statAsset.name)
        ? bundlesSources[statAsset.name]
        : null;

    if (assetSources) {
      asset.parsedSize = Buffer.byteLength(assetSources.src);

      if (compressionAlgorithm === "gzip") {
        asset.gzipSize = getCompressedSize("gzip", assetSources.src);
      }

      if (compressionAlgorithm === "brotli") {
        asset.brotliSize = getCompressedSize("brotli", assetSources.src);
      }

      if (compressionAlgorithm === "zstd") {
        asset.zstdSize = getCompressedSize("zstd", assetSources.src);
      }
    }

    // Picking modules from current bundle script
    /** @type {StatsModule[]} */
    let assetModules = (modules || []).filter((statModule) =>
      assetHasModule(statAsset, statModule),
    );

    // Adding parsed sources
    if (parsedModules) {
      /** @type {StatsModule[]} */
      const unparsedEntryModules = [];

      for (const statsModule of assetModules) {
        if (
          typeof statsModule.id !== "undefined" &&
          parsedModules[statsModule.id]
        ) {
          statsModule.parsedSrc = parsedModules[statsModule.id];
        } else if (isEntryModule(statsModule)) {
          unparsedEntryModules.push(statsModule);
        }
      }

      // Webpack 5 changed bundle format and now entry modules are concatenated and located at the end of it.
      // Because of this they basically become a concatenated module, for which we can't even precisely determine its
      // parsed source as it's located in the same scope as all Webpack runtime helpers.
      if (unparsedEntryModules.length && assetSources) {
        if (unparsedEntryModules.length === 1) {
          // So if there is only one entry we consider its parsed source to be all the bundle code excluding code
          // from parsed modules.
          unparsedEntryModules[0].parsedSrc = assetSources.runtimeSrc;
        } else {
          // If there are multiple entry points we move all of them under synthetic concatenated module.
          assetModules = (assetModules || []).filter(
            (mod) => !unparsedEntryModules.includes(mod),
          );
          assetModules.unshift({
            identifier: "./entry modules",
            name: "./entry modules",
            modules: unparsedEntryModules,
            size: unparsedEntryModules.reduce(
              (totalSize, module) =>
                totalSize + /** @type {number} */ (module.size),
              0,
            ),
            parsedSrc: assetSources.runtimeSrc,
          });
        }
      }
    }

    asset.modules = assetModules;
    asset.tree = createModulesTree(asset.modules, { compressionAlgorithm });

    return result;
  }, /** @type {Record<string, Asset>} */ ({}));

  const chunkToInitialByEntrypoint = getChunkToInitialByEntrypoint(bundleStats);

  return Object.entries(assets).map(([filename, asset]) => ({
    label: filename,
    isAsset: true,
    // Not using `asset.size` here provided by Webpack because it can be very confusing when `UglifyJsPlugin` is used.
    // In this case all module sizes from stats file will represent unminified module sizes, but `asset.size` will
    // be the size of minified bundle.
    // Using `asset.size` only if current asset doesn't contain any modules (resulting size equals 0)
    statSize: asset.tree.size || asset.size,
    parsedSize: asset.parsedSize,
    gzipSize: asset.gzipSize,
    brotliSize: asset.brotliSize,
    zstdSize: asset.zstdSize,
    groups: Object.values(asset.tree.children).map((i) => i.toChartData()),
    isInitialByEntrypoint: chunkToInitialByEntrypoint[filename] ?? {},
  }));
}

/**
 * @param {string} filename filename
 * @returns {Promise<StatsCompilation>} result
 */
function readStatsFromFile(filename) {
  return parseChunked(fs.createReadStream(filename, { encoding: "utf8" }));
}

module.exports = {
  getViewerData,
  readStatsFromFile,
};
