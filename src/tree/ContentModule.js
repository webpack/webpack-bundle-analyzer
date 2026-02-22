import Module from "./Module.js";

/** @typedef {import("webpack").StatsModule} StatsModule */
/** @typedef {import("./Node").default} NodeType */
/** @typedef {import("./Module").ModuleChartData} ModuleChartData */
/** @typedef {import("./Module").ModuleOptions} ModuleOptions */
/** @typedef {import("./Module").SizeType} SizeType */
/** @typedef {import("./ConcatenatedModule").default} ConcatenatedModule */

/**
 * @typedef {object} OwnContentModuleChartData
 * @property {boolean} inaccurateSizes true when inaccurate sizes, otherwise false
 */

/** @typedef {ModuleChartData & OwnContentModuleChartData} ContentModuleChartData */

export default class ContentModule extends Module {
  /**
   * @param {string} name name
   * @param {StatsModule} data data
   * @param {ConcatenatedModule} ownerModule owner module
   * @param {ModuleOptions} opts options
   */
  constructor(name, data, ownerModule, opts) {
    super(name, data, undefined, opts);
    /** @type {ConcatenatedModule} */
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
   * @returns {ContentModuleChartData} chart data
   */
  toChartData() {
    return {
      ...super.toChartData(),
      inaccurateSizes: true,
    };
  }
}
