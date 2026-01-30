const fs = require("fs");
const path = require("path");

const { parseChunked } = require("@discoveryjs/json-ext");

const Logger = require("./Logger");
const Folder = require("./tree/Folder").default;
const { parseBundle } = require("./parseUtils");
const { createAssetsFilter } = require("./utils");
const { getCompressedSize } = require("./sizeUtils");

const FILENAME_QUERY_REGEXP = /\?.*$/u;
const FILENAME_EXTENSIONS = /\.(js|mjs|cjs|bundle)$/iu;

module.exports = {
  getViewerData,
  readStatsFromFile,
};

function getViewerData(bundleStats, bundleDir, opts) {
  const {
    logger = new Logger(),
    compressionAlgorithm,
    excludeAssets = null,
  } = opts || {};

  const isAssetIncluded = createAssetsFilter(excludeAssets);

  // Sometimes all the information is located in `children` array (e.g. problem in #10)
  if (
    (bundleStats.assets == null || bundleStats.assets.length === 0) &&
    bundleStats.children &&
    bundleStats.children.length > 0
  ) {
    const { children } = bundleStats;
    bundleStats = bundleStats.children[0];
    // Sometimes if there are additional child chunks produced add them as child assets,
    // leave the 1st one as that is considered the 'root' asset.
    for (let i = 1; i < children.length; i++) {
      children[i].assets.forEach((asset) => {
        asset.isChild = true;
        bundleStats.assets.push(asset);
      });
    }
  } else if (bundleStats.children && bundleStats.children.length > 0) {
    // Sometimes if there are additional child chunks produced add them as child assets
    bundleStats.children.forEach((child) => {
      child.assets.forEach((asset) => {
        asset.isChild = true;
        bundleStats.assets.push(asset);
      });
    });
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
      asset.chunks.length > 0 &&
      isAssetIncluded(asset.name)
    );
  });

  // Trying to parse bundle assets and get real module sizes if `bundleDir` is provided
  let bundlesSources = null;
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
        const msg = err.code === "ENOENT" ? "no such file" : err.message;
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

  const assets = bundleStats.assets.reduce((result, statAsset) => {
    // If asset is a childAsset, then calculate appropriate bundle modules by looking through stats.children
    const assetBundles = statAsset.isChild
      ? getChildAssetBundles(bundleStats, statAsset.name)
      : bundleStats;
    const modules = assetBundles ? getBundleModules(assetBundles) : [];
    const asset = (result[statAsset.name] = {
      size: statAsset.size,
    });
    const assetSources =
      bundlesSources &&
      Object.prototype.hasOwnProperty.call(bundlesSources, statAsset.name)
        ? bundlesSources[statAsset.name]
        : null;

    if (assetSources) {
      asset.parsedSize = Buffer.byteLength(assetSources.src);
      if (compressionAlgorithm === "gzip")
        asset.gzipSize = getCompressedSize("gzip", assetSources.src);
      if (compressionAlgorithm === "brotli")
        asset.brotliSize = getCompressedSize("brotli", assetSources.src);
      if (compressionAlgorithm === "zstd")
        asset.zstdSize = getCompressedSize("zstd", assetSources.src);
    }

    // Picking modules from current bundle script
    let assetModules = (modules || []).filter((statModule) =>
      assetHasModule(statAsset, statModule),
    );

    // Adding parsed sources
    if (parsedModules) {
      const unparsedEntryModules = [];

      for (const statModule of assetModules) {
        if (parsedModules[statModule.id]) {
          statModule.parsedSrc = parsedModules[statModule.id];
        } else if (isEntryModule(statModule)) {
          unparsedEntryModules.push(statModule);
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
              (totalSize, module) => totalSize + module.size,
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
  }, {});

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

function readStatsFromFile(filename) {
  return parseChunked(fs.createReadStream(filename, { encoding: "utf8" }));
}

function getChildAssetBundles(bundleStats, assetName) {
  return flatten(
    (bundleStats.children || []).find((c) =>
      Object.values(c.assetsByChunkName),
    ),
  ).includes(assetName);
}

function getBundleModules(bundleStats) {
  const seenIds = new Set();

  return flatten(
    (bundleStats.chunks?.map((chunk) => chunk.modules) || [])
      .concat(bundleStats.modules)
      .filter(Boolean),
  ).filter((mod) => {
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

function assetHasModule(statAsset, statModule) {
  // Checking if this module is the part of asset chunks
  return (statModule.chunks || []).some((moduleChunk) =>
    statAsset.chunks.includes(moduleChunk),
  );
}

function isEntryModule(statModule) {
  return statModule.depth === 0;
}

function isRuntimeModule(statModule) {
  return statModule.moduleType === "runtime";
}

function createModulesTree(modules, opts) {
  const root = new Folder(".", opts);

  modules.forEach((module) => root.addModule(module));
  root.mergeNestedFolders();

  return root;
}

function getChunkToInitialByEntrypoint(bundleStats) {
  if (bundleStats == null) {
    return {};
  }
  const chunkToEntrypointInititalMap = {};
  Object.values(bundleStats.entrypoints || {}).forEach((entrypoint) => {
    for (const asset of entrypoint.assets) {
      chunkToEntrypointInititalMap[asset.name] =
        chunkToEntrypointInititalMap[asset.name] ?? {};
      chunkToEntrypointInititalMap[asset.name][entrypoint.name] = true;
    }
  });
  return chunkToEntrypointInititalMap;
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
