const fs = require("node:fs");
const path = require("node:path");

const { parseBundle } = require("../src/parseUtils");

const BUNDLES_DIR = path.resolve(__dirname, "./bundles");

describe("parseBundle", () => {
  // `.mjs` bundles are Webpack 5 ESM output (`output.module`) and are parsed as modules.
  const bundles = fs
    .readdirSync(BUNDLES_DIR)
    .filter((filename) => /\.m?js$/u.test(filename));

  for (const filename of bundles.filter((filename) =>
    filename.startsWith("valid"),
  )) {
    const bundleName = filename.replace(/\.m?js$/u, "");

    it(`should parse ${bundleName.toLocaleLowerCase()}`, () => {
      const bundleFile = `${BUNDLES_DIR}/${filename}`;
      const bundle = parseBundle(
        bundleFile,
        filename.endsWith(".mjs") ? { sourceType: "module" } : undefined,
      );
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

  it("should rank every top-level module map the runtime calls by the expected module ids", () => {
    // Real Webpack 5.105.2 ESM entry chunk with a raw banner that declares and calls an object of functions
    const bundleFile = `${BUNDLES_DIR}/webpack5EsmEntryChunkWithCalledBannerObject.mjs`;

    expect(
      Object.keys(
        parseBundle(bundleFile, {
          sourceType: "module",
          expectedModuleIds: [967],
        }).modules,
      ),
    ).toEqual(["967"]);
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
