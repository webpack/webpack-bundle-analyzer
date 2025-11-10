const {expect} = require('chai');
const analyzer = require('../lib/analyzer');

describe('Real-world incomplete stats scenarios', function() {
  it('should handle stats from minimal webpack config', function() {
    const realWorldStats = {
      version: "5.0.0",
      hash: "abc123def456",
      publicPath: "/dist/",
      outputPath: "/project/dist",
      chunks: [
        {
          id: 0,
          names: ["main"],
          files: ["main.js"],
          hash: "abc123",
          size: 1024
        }
      ],
      // Real-world scenario: assets array missing (common in minimal configs)
      // Real-world scenario: modules array missing (some webpack versions)
      errors: [],
      warnings: [],
      entrypoints: {
        main: {
          chunks: [0],
          assets: ["main.js"]
        }
      }
    };

    expect(() => {
      const result = analyzer.getViewerData(realWorldStats);
      expect(result).to.be.an('array');
    }).not.to.throw();
  });

  it('should handle stats with only essential webpack 5 fields', function() {
    const webpack5MinimalStats = {
      version: "5.0.0",
      hash: "webpack5minimal",
      publicPath: "/",
      outputPath: "/build",
      chunks: [],
      entrypoints: {},
      // Common real-world scenario: missing assets and modules
      errors: [],
      warnings: [],
      namedChunkGroups: {}
    };

    const result = analyzer.getViewerData(webpack5MinimalStats);
    expect(result).to.be.an('array').that.is.empty;
  });
});