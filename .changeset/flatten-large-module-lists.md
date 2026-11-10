---
"webpack-bundle-analyzer": patch
---

Fix `RangeError: Maximum call stack size exceeded` when a chunk contains a very large number of modules (around 130,000 or more).
