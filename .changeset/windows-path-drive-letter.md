---
"webpack-bundle-analyzer": patch
---

Keep the drive letter of absolute Windows module paths, so modules that only differ by their drive are no longer merged into one node in the report.
