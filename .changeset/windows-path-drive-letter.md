---
"webpack-bundle-analyzer": patch
---

Keep the drive letter of absolute Windows module paths and the server of UNC module paths, so modules that only differ by their drive or server are no longer merged into one node in the report.
