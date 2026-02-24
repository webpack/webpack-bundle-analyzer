import zlib from "node:zlib";

export const isZstdSupported = "createZstdCompress" in zlib;

/** @typedef {"gzip" | "brotli" | "zstd"} Algorithm */

/**
 * @param {Algorithm} algorithm compression algorithm
 * @param {string} input input
 * @returns {number} compressed size
 */
export function getCompressedSize(algorithm, input) {
  if (algorithm === "gzip") {
    return zlib.gzipSync(input, { level: 9 }).length;
  }

  if (algorithm === "brotli") {
    return zlib.brotliCompressSync(input).length;
  }

  if (algorithm === "zstd" && isZstdSupported) {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    return zlib.zstdCompressSync(input).length;
  }

  throw new Error(`Unsupported compression algorithm: ${algorithm}.`);
}
