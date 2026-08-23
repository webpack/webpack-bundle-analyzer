---
"webpack-bundle-analyzer": patch
---

Scope parsed module sources to the asset they were parsed from, so assets produced by separate compilations (for example a main bundle and a worker bundle) no longer overwrite each other's parsed sizes when they reuse the same module IDs.
