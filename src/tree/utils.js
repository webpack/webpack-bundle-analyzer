const MULTI_MODULE_REGEXP = /^multi /u;

/** @typedef {import("webpack").StatsModule} StatsModule */

/**
 * @param {StatsModule} moduleData moduleData
 * @returns {string[] | null} module path parts
 */
export function getModulePathParts(moduleData) {
  if (
    moduleData.identifier &&
    MULTI_MODULE_REGEXP.test(moduleData.identifier)
  ) {
    return [moduleData.identifier];
  }

  if (!moduleData.name) {
    return null;
  }

  const loaders = moduleData.name.split("!");
  // Removing loaders from module path: they're joined by `!` and the last part is a raw module path
  const parsedPath = loaders[loaders.length - 1]
    // Splitting module path into parts
    .split("/")
    // Removing first `.`
    .slice(1)
    // Replacing `~` with `node_modules`
    .map((part) => (part === "~" ? "node_modules" : part));

  return parsedPath.length ? parsedPath : null;
}
