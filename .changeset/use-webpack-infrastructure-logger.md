---
"webpack-bundle-analyzer": minor
---

Use Webpack's infrastructure logger when available (`compiler.getInfrastructureLogger('webpack-bundle-analyzer')`) and deprecate the plugin's `logLevel` option in favor of Webpack's native `infrastructureLogging` configuration.
