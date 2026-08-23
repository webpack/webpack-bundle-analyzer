---
"webpack-bundle-analyzer": patch
---

Scope parsed module sources to the asset they were parsed from, so assets that reuse the same module IDs, or that share a module, no longer report each other's parsed and compressed sizes.
