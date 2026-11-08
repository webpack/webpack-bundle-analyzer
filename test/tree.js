"use strict";

const Module =
  require("../src/tree/Module").default || require("../src/tree/Module");
const Folder =
  require("../src/tree/Folder").default || require("../src/tree/Folder");

describe("parsed size", () => {
  // Non-ASCII module code: a CJK character is 3 UTF-8 bytes and 1 UTF-16 code
  // unit, while the emoji is a surrogate pair — 2 code units but 4 UTF-8 bytes.
  // A per-code-unit approximation would therefore over-count the emoji.
  const source =
    'export const zh = { title: "欢迎使用我们的应用程序 😀", error: "发生了未知错误，请稍后重试" };';
  const opts = { compressionAlgorithm: "gzip" };

  it("counts the UTF-8 bytes of a module source, not its UTF-16 code units", () => {
    const module = new Module(
      "zh.js",
      { size: 1, parsedSrc: source },
      undefined,
      opts,
    );

    expect(module.parsedSize).toBe(Buffer.byteLength(source));
    expect(module.parsedSize).toBeGreaterThan(source.length);
  });

  it("counts the UTF-8 bytes of a folder's parsed source", () => {
    const folder = new Folder("root", opts);
    folder.addChildModule(
      new Module("zh.js", { size: 1, parsedSrc: source }, undefined, opts),
    );

    expect(folder.parsedSize).toBe(Buffer.byteLength(source));
  });
});
