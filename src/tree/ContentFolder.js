import BaseFolder from "./BaseFolder.js";

/** @typedef {import("./Node").default} Node */
/** @typedef {import("./ConcatenatedModule").default} ConcatenatedModule */
/** @typedef {import("./BaseFolder").BaseFolderChartData} BaseFolderChartData */
/** @typedef {import("./Module").SizeType} SizeType */

/**
 * @typedef {object} OwnContentFolderChartData
 * @property {number | undefined} parsedSize parsed size
 * @property {number | undefined} gzipSize gzip size
 * @property {number | undefined} brotliSize brotli size
 * @property {number | undefined} zstdSize zstd size
 * @property {boolean} inaccurateSizes true when inaccurate sizes, otherwise false
 */

/** @typedef {BaseFolderChartData & OwnContentFolderChartData} ContentFolderChartData  */

export default class ContentFolder extends BaseFolder {
  /**
   * @param {string} name name
   * @param {ConcatenatedModule} ownerModule owner module
   * @param {Node=} parent v
   */
  constructor(name, ownerModule, parent) {
    super(name, parent);
    this.ownerModule = ownerModule;
  }

  get parsedSize() {
    return this.getSize("parsedSize");
  }

  get gzipSize() {
    return this.getSize("gzipSize");
  }

  get brotliSize() {
    return this.getSize("brotliSize");
  }

  get zstdSize() {
    return this.getSize("zstdSize");
  }

  /**
   * @param {SizeType} sizeType size type
   * @returns {number | undefined} size
   */
  getSize(sizeType) {
    const ownerModuleSize = this.ownerModule[sizeType];

    if (ownerModuleSize !== undefined) {
      return Math.floor((this.size / this.ownerModule.size) * ownerModuleSize);
    }
  }

  /**
   * @returns {ContentFolderChartData} chart data
   */
  toChartData() {
    return {
      ...super.toChartData(),
      parsedSize: this.parsedSize,
      gzipSize: this.gzipSize,
      brotliSize: this.brotliSize,
      zstdSize: this.zstdSize,
      inaccurateSizes: true,
    };
  }
}
