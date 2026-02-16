import zlib from "node:zlib";

export const isZstdSupported = "createZstdCompress" in zlib;

export function getCompressedSize(compressionAlgorithm, input) {
  if (compressionAlgorithm === "gzip") {
    return zlib.gzipSync(input, { level: 9 }).length;
  }

  if (compressionAlgorithm === "brotli") {
    return zlib.brotliCompressSync(input).length;
  }

  if (compressionAlgorithm === "zstd" && isZstdSupported) {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    return zlib.zstdCompressSync(input).length;
  }

  throw new Error(
    `Unsupported compression algorithm: ${compressionAlgorithm}.`,
  );
}
