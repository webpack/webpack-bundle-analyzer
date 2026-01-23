const { createAssetsFilter } = require("../lib/utils");

describe("createAssetsFilter", function () {
  it("should create a noop filter if pattern is not set", function () {
    for (const pattern of [undefined, null, []]) {
      const filter = createAssetsFilter(pattern);
      expect(filter("foo")).to.equal(true);
    }
  });

  it("should allow a string as a pattern", function () {
    const filter = createAssetsFilter("^foo");
    expect(filter("foo")).to.equal(false);
    expect(filter("foo-bar")).to.equal(false);
    expect(filter("bar")).to.equal(true);
    expect(filter("bar-foo")).to.equal(true);
  });

  it("should allow a RegExp as a pattern", function () {
    const filter = createAssetsFilter(/^foo/iu);
    expect(filter("foo")).to.equal(false);
    expect(filter("FOO")).to.equal(false);
    expect(filter("foo-bar")).to.equal(false);
    expect(filter("bar")).to.equal(true);
    expect(filter("bar-foo")).to.equal(true);
  });

  it("should allow a filter function as a pattern", function () {
    const filter = createAssetsFilter((asset) => asset.startsWith("foo"));
    expect(filter("foo")).to.equal(false);
    expect(filter("foo-bar")).to.equal(false);
    expect(filter("bar")).to.equal(true);
    expect(filter("bar-foo")).to.equal(true);
  });

  it("should throw on invalid pattern types", function () {
    expect(() => createAssetsFilter(5)).to.throw('but "5" got');
    expect(() => createAssetsFilter({ a: 1 })).to.throw('but "{ a: 1 }" got');
    expect(() => createAssetsFilter([true])).to.throw('but "true" got');
  });

  it("should allow an array of patterns", function () {
    const filter = createAssetsFilter([
      "^foo",
      /bar$/iu,
      (asset) => asset.includes("baz"),
    ]);
    expect(filter("foo")).to.equal(false);
    expect(filter("bar")).to.equal(false);
    expect(filter("fooBar")).to.equal(false);
    expect(filter("fooBARbaz")).to.equal(false);
    expect(filter("bar-foo")).to.equal(true);
  });
});
