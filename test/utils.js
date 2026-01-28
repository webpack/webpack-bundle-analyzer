const { createAssetsFilter } = require("../lib/utils");

describe("createAssetsFilter", () => {
  it("should create a noop filter if pattern is not set", () => {
    for (const pattern of [undefined, null, []]) {
      const filter = createAssetsFilter(pattern);
      expect(filter("foo")).toBe(true);
    }
  });

  it("should allow a string as a pattern", () => {
    const filter = createAssetsFilter("^foo");
    expect(filter("foo")).toBe(false);
    expect(filter("foo-bar")).toBe(false);
    expect(filter("bar")).toBe(true);
    expect(filter("bar-foo")).toBe(true);
  });

  it("should allow a RegExp as a pattern", () => {
    const filter = createAssetsFilter(/^foo/iu);
    expect(filter("foo")).toBe(false);
    expect(filter("FOO")).toBe(false);
    expect(filter("foo-bar")).toBe(false);
    expect(filter("bar")).toBe(true);
    expect(filter("bar-foo")).toBe(true);
  });

  it("should allow a filter function as a pattern", () => {
    const filter = createAssetsFilter((asset) => asset.startsWith("foo"));
    expect(filter("foo")).toBe(false);
    expect(filter("foo-bar")).toBe(false);
    expect(filter("bar")).toBe(true);
    expect(filter("bar-foo")).toBe(true);
  });

  it("should throw on invalid pattern types", () => {
    expect(() => createAssetsFilter(5)).toThrow('but "5" got');
    expect(() => createAssetsFilter({ a: 1 })).toThrow('but "{ a: 1 }" got');
    expect(() => createAssetsFilter([true])).toThrow('but "true" got');
  });

  it("should allow an array of patterns", () => {
    const filter = createAssetsFilter([
      "^foo",
      /bar$/iu,
      (asset) => asset.includes("baz"),
    ]);
    expect(filter("foo")).toBe(false);
    expect(filter("bar")).toBe(false);
    expect(filter("fooBar")).toBe(false);
    expect(filter("fooBARbaz")).toBe(false);
    expect(filter("bar-foo")).toBe(true);
  });
});
