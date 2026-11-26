---
"webpack-bundle-analyzer": patch
---

Fix parsed and compressed sizes missing for modules in webpack 5 ESM output (`output.module`), where the module map is exported by async chunks or declared at the top level of the entry chunk.
