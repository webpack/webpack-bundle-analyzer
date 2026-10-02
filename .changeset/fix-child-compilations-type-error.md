---
"webpack-bundle-analyzer": patch
---

Fix `TypeError: Cannot read property 'forEach' of undefined` when child compilations or entrypoints have undefined or missing assets.
