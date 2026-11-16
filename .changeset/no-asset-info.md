---
"webpack-bundle-analyzer": patch
---

Fix parsed and compressed sizes disappearing when a stats entry has no `info` object, as webpack 4.35 and hand-built stats objects produce.
