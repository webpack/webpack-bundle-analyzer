const analyzer = require('./lib/analyzer');

// Test with minimal stats (missing assets array)
const testStats = {
  version: "5.0.0",
  hash: "test123",
  chunks: [],
  // assets: undefined, // This is missing - should trigger the original bug
  errors: [],
  warnings: [],
  entrypoints: {},
  namedChunkGroups: {},
  outputPath: "/tmp",
  publicPath: "/"
};

console.log('🧪 Testing fix...');
try {
  const result = analyzer.getViewerData(testStats);
  console.log('✅ SUCCESS! Fix works - no more TypeError');
  console.log('Result has', result.length, 'assets');
} catch (error) {
  console.error('❌ FAILED:', error.message);
}