const fs = require("node:fs");
const path = require("node:path");

const { parseBundle } = require("../lib/parseUtils");

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

  it("should parse invalid bundle and return it's content and empty modules hash", () => {
    const bundleFile = `${BUNDLES_DIR}/invalidBundle.js`;
    const bundle = parseBundle(bundleFile);
    expect(bundle.src).toBe(fs.readFileSync(bundleFile, "utf8"));
    expect(bundle.modules).toEqual({});
  });
});
