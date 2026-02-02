const { readFileSync } = require("node:fs");
const path = require("node:path");
const { globSync } = require("tinyglobby");
const { StatsSerializeStream } = require("../lib/statsUtils");

async function stringify(json) {
  return new Promise((resolve, reject) => {
    let result = "";

    new StatsSerializeStream(json)
      .on("data", (chunk) => (result += chunk))
      .on("end", () => resolve(result))
      .on("error", reject);
  });
}

async function expectProperJson(json) {
  expect(await stringify(json)).toBe(JSON.stringify(json, null, 2));
}

describe("StatsSerializeStream", () => {
  it("should properly stringify primitives", () => {
    expectProperJson(0);
    expectProperJson(1);
    expectProperJson(-1);
    expectProperJson(42.42);
    expectProperJson(-42.42);
    expectProperJson(false);
    expectProperJson(true);
    expectProperJson(null);
    expectProperJson(null);
    expectProperJson("");
    expectProperJson('"');
    expectProperJson("foo bar");
    expectProperJson('"foo bar"');
    expectProperJson("Вива Лас-Вегас!");
  });

  it("should properly stringify simple arrays", () => {
    expectProperJson([]);
    expectProperJson([1, undefined, 2]);
    // eslint-disable-next-line no-sparse-arrays
    expectProperJson([1, , 2]);
    expectProperJson([false, "f'o\"o", -1, 42.42]);
  });

  it("should properly stringify objects", () => {
    expectProperJson({});
    expectProperJson({
      a: 1,
      "foo-bar": null,
      undef: undefined,
      '"Гусь!"': true,
    });
  });

  it("should properly stringify complex structures", () => {
    expectProperJson({
      foo: [],
      bar: {
        baz: [
          1,
          { a: 1, b: ["foo", "bar"], c: [] },
          "foo",
          { a: 1, b: undefined, c: [{ d: true }] },
          null,
          undefined,
        ],
      },
    });
  });

  for (const filepath of globSync("stats/**/*.json", { cwd: __dirname })) {
    it(`should properly stringify JSON from "${filepath}"`, () => {
      const content = readFileSync(path.resolve(__dirname, filepath), "utf8");
      const json = JSON.parse(content);
      expectProperJson(json);
    });
  }
});
