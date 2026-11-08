---
"webpack-bundle-analyzer": patch
---

Count module and folder parsed sizes in UTF-8 bytes instead of UTF-16 code units, matching the asset parsed size and the compressed sizes, so modules containing non-ASCII code (CJK text, emoji data, translations) are no longer reported smaller than their own gzip size.
