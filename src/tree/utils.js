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
  // Splitting module path into parts, module names use both `/` and `\` separators
  const parts = loaders[loaders.length - 1].split(/[\\/]/u);

  // Removing the leading `.` of a relative module name, and the empty parts that an
  // absolute one starts with (`/src/x.js`, `\\server\share\x.js`).
  // A drive letter is kept: the same relative path on another drive is a different
  // module, and cutting the drive letter off merges both modules into a single node.
  let start = 1;

  if (/^[A-Za-z]:$/u.test(parts[0])) {
    start = 0;
  } else if (parts[0] === "") {
    const firstNamedPart = parts.findIndex((part) => part !== "");

    start = firstNamedPart === -1 ? parts.length : firstNamedPart;
  }

  // Replacing `~` with `node_modules`
  const parsedPath = parts
    .slice(start)
    .map((part) => (part === "~" ? "node_modules" : part));

  return parsedPath.length ? parsedPath : null;
}
