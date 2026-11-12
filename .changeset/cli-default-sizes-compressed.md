---
"webpack-bundle-analyzer": patch
---

Accept `brotli` and `zstd` in the CLI `--default-sizes` option, as the README documents. Without `--compression-algorithm`, they also select that compression algorithm.
