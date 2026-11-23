const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { parseBundle } = require("../src/parseUtils");

const BUNDLES_DIR = path.resolve(__dirname, "./bundles");

describe("parseBundle", () => {
  const bundles = fs
    .readdirSync(BUNDLES_DIR)
    .filter((filename) => filename.endsWith(".js"))
    .map((filename) => filename.replace(/\.js$/u, ""));

  for (const bundleName of bundles.filter((bundleName) =>
    bundleName.startsWith("valid"),
  )) {
    it(`should parse ${bundleName.toLocaleLowerCase()}`, () => {
      const bundleFile = `${BUNDLES_DIR}/${bundleName}.js`;
      const bundle = parseBundle(bundleFile);
      const expectedModules = JSON.parse(
        fs.readFileSync(`${BUNDLES_DIR}/${bundleName}.modules.json`),
      );

      expect(bundle.src).toBe(fs.readFileSync(bundleFile, "utf8"));
      expect(bundle.modules).toEqual(expectedModules.modules);
    });
  }

  for (const [description, expectedModuleIds] of [
    ["without module id hints", undefined],
    ["with partial module id hints", [447]],
    ["with tied partial module id hints", [447, 999]],
    ["with non-matching module id hints", ["missing"]],
  ]) {
    it(`should ignore empty and decoy IIFEs ${description}`, () => {
      const bundleName = "webpack5UmdBundleWithDecoyIIFE";
      const bundleFile = `${BUNDLES_DIR}/${bundleName}.js`;
      const expectedModules = JSON.parse(
        fs.readFileSync(`${BUNDLES_DIR}/${bundleName}.modules.json`),
      );
      const bundle = parseBundle(
        bundleFile,
        expectedModuleIds ? { expectedModuleIds } : undefined,
      );

      expect(bundle.modules).toEqual(expectedModules.modules);
    });
  }

  it("should preserve the top-level Webpack 5 module-map fallback", () => {
    const bundleName = "webpack5TopLevelModulesWithoutRuntime";
    const bundleFile = `${BUNDLES_DIR}/${bundleName}.js`;
    const expectedModules = JSON.parse(
      fs.readFileSync(`${BUNDLES_DIR}/${bundleName}.modules.json`),
    );

    expect(parseBundle(bundleFile).modules).toEqual(expectedModules.modules);
  });

  describe("Webpack 5 ESM output (`output.module`)", () => {
    const entryChunk = [
      "var __webpack_modules__ = ({",
      "  967: ((module) => { module.exports = 'a'; })",
      "});",
      "var __webpack_module_cache__ = {};",
      "function __webpack_require__(moduleId) {",
      "  var cached = __webpack_module_cache__[moduleId] = { exports: {} };",
      "  __webpack_modules__[moduleId](cached, cached.exports, __webpack_require__);",
      "  return cached.exports;",
      "}",
      "(() => {",
      "  var installedChunks = { 792: 0 };",
      "})();",
      "export default __webpack_require__(967);",
      "",
    ].join("\n");

    for (const [description, source, expectedIds] of [
      [
        "a chunk that exports the module map",
        "export const __webpack_esm_id__ = 1;\nexport const __webpack_esm_ids__ = [1];\nexport const __webpack_esm_modules__ = {\n  7: (e) => { e.exports = 7; },\n  8: (e) => { e.exports = 8; }\n};\n",
        ["7", "8"],
      ],
      [
        "a chunk that exports the module map as an array",
        "export const __webpack_esm_modules__ = [\n  (e) => { e.exports = 0; },\n  (e) => { e.exports = 1; }\n];\n",
        ["0", "1"],
      ],
      [
        "a chunk that exports the module map as `modules`",
        "export const id = 1;\nexport const ids = [1];\nexport const modules = {\n  7: (e) => { e.exports = 7; }\n};\n",
        ["7"],
      ],
      ["an entry chunk with a top-level module map", entryChunk, ["967"]],
    ]) {
      it(`should parse ${description}`, () => {
        const bundleFile = path.join(
          os.tmpdir(),
          `wba-esm-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`,
        );

        fs.writeFileSync(bundleFile, source);

        try {
          const { modules } = parseBundle(bundleFile, {
            sourceType: "module",
            expectedModuleIds: expectedIds,
          });

          expect(Object.keys(modules).toSorted()).toEqual(expectedIds);
        } finally {
          fs.rmSync(bundleFile, { force: true });
        }
      });
    }
  });

  it("should ignore nested module maps without a Webpack runtime", () => {
    const bundleFile = `${BUNDLES_DIR}/webpack5NestedModulesWithoutRuntime.js`;

    expect(parseBundle(bundleFile).modules).toEqual({});
    expect(
      parseBundle(bundleFile, { expectedModuleIds: [123] }).modules,
    ).toEqual({});
  });

  it("should parse invalid bundle and return it's content and empty modules hash", () => {
    const bundleFile = `${BUNDLES_DIR}/invalidBundle.js`;
    const bundle = parseBundle(bundleFile);
    expect(bundle.src).toBe(fs.readFileSync(bundleFile, "utf8"));
    expect(bundle.modules).toEqual({});
  });
});
