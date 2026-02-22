import { getCompressedSize } from "../sizeUtils.js";
import BaseFolder from "./BaseFolder.js";
import ConcatenatedModule from "./ConcatenatedModule.js";
import Module from "./Module.js";
import { getModulePathParts } from "./utils.js";

/** @typedef {import("webpack").StatsModule} StatsModule */
/** @typedef {import("../analyzer").AnalyzerOptions} AnalyzerOptions */
/** @typedef {import("../analyzer").CompressionAlgorithm} CompressionAlgorithm */
/** @typedef {import("./BaseFolder").BaseFolderChartData} BaseFolderChartData */

/**
 * @typedef {object} OwnFolderChartData
 * @property {number} parsedSize parsed size
 * @property {number | undefined} gzipSize gzip size
 * @property {number | undefined} brotliSize brotli size
 * @property {number | undefined} zstdSize zstd size
 */

/** @typedef {BaseFolderChartData & OwnFolderChartData} FolderChartData */

export default class Folder extends BaseFolder {
  /**
   * @param {string} name name
   * @param {AnalyzerOptions} opts options
   */
  constructor(name, opts) {
    super(name);
    /** @type {AnalyzerOptions} */
    this.opts = opts;
    /** @type {number | undefined} */
    this._gzipSize = undefined;
    /** @type {number | undefined} */
    this._brotliSize = undefined;
    /** @type {number | undefined} */
    this._zstdSize = undefined;
  }

  get parsedSize() {
    return this.src ? this.src.length : 0;
  }

  get gzipSize() {
    return this.opts.compressionAlgorithm === "gzip"
      ? this.getCompressedSize("gzip")
      : undefined;
  }

  get brotliSize() {
    return this.opts.compressionAlgorithm === "brotli"
      ? this.getCompressedSize("brotli")
      : undefined;
  }

  get zstdSize() {
    return this.opts.compressionAlgorithm === "zstd"
      ? this.getCompressedSize("zstd")
      : undefined;
  }

  /**
   * @param {CompressionAlgorithm} compressionAlgorithm compression algorithm
   * @returns {number | undefined} compressed size
   */
  getCompressedSize(compressionAlgorithm) {
    const key =
      /** @type {`_${CompressionAlgorithm}Size`} */
      (`_${compressionAlgorithm}Size`);

    if (!Object.hasOwn(this, key)) {
      this[key] = this.src
        ? getCompressedSize(compressionAlgorithm, this.src)
        : 0;
    }

    return this[key];
  }

  /**
   * @param {StatsModule} moduleData stats module
   */
  addModule(moduleData) {
    const pathParts = getModulePathParts(moduleData);

    if (!pathParts) {
      return;
    }

    const [folders, fileName] = [
      pathParts.slice(0, -1),
      pathParts[pathParts.length - 1],
    ];
    /** @type {BaseFolder} */
    let currentFolder = this;

    for (const folderName of folders) {
      let childNode = currentFolder.getChild(folderName);

      if (
        // Folder is not created yet
        !childNode ||
        // In some situations (invalid usage of dynamic `require()`) webpack generates a module with empty require
        // context, but it's moduleId points to a directory in filesystem.
        // In this case we replace this `File` node with `Folder`.
        // See `test/stats/with-invalid-dynamic-require.json` as an example.
        !(childNode instanceof Folder)
      ) {
        childNode = currentFolder.addChildFolder(
          new Folder(folderName, this.opts),
        );
      }

      currentFolder = childNode;
    }

    const ModuleConstructor = moduleData.modules ? ConcatenatedModule : Module;
    const module = new ModuleConstructor(fileName, moduleData, this, this.opts);
    currentFolder.addChildModule(module);
  }

  /**
   * @returns {FolderChartData} chart data
   */
  toChartData() {
    return {
      ...super.toChartData(),
      parsedSize: this.parsedSize,
      gzipSize: this.gzipSize,
      brotliSize: this.brotliSize,
      zstdSize: this.zstdSize,
    };
  }
}
