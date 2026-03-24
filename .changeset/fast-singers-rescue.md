---
"webpack-bundle-analyzer": patch
---

Fix a race condition in `writeStats` that could lead to incorrect content in `stats.json`.
