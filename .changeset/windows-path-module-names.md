---
"webpack-bundle-analyzer": patch
---

Keep modules in the report when their names use Windows path separators, which happens when a module is resolved from another drive and Webpack keeps its absolute path as the module name.
