/**
 * @param {Chunk} chunk chunk
 * @returns {boolean} true when chunk is parser, otherwise false
 */
export function isChunkParsed(chunk) {
  return typeof chunk.parsedSize === "number";
}

/**
 * @param {Module[]} modules modules
 * @param {(module: Module) => boolean} cb callback
 * @returns {boolean} state
 */
export function walkModules(modules, cb) {
  for (const module of modules) {
    if (cb(module) === false) return false;

    if (module.groups && walkModules(module.groups, cb) === false) {
      return false;
    }
  }
}

/**
 * @template T
 * @param {T} elem element
 * @param {T[]} container container
 * @returns {boolean} true when element is outside, otherwise false
 */
export function elementIsOutside(elem, container) {
  return !(elem === container || container.contains(elem));
}
