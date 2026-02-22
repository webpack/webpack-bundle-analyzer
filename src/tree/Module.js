import { getCompressedSize } from "../sizeUtils.js";
import Node from "./Node.js";

/** @typedef {import("webpack").StatsModule} StatsModule */
/** @typedef {import("../sizeUtils").Algorithm} CompressionAlgorithm */

/** @typedef {{ compressionAlgorithm: CompressionAlgorithm }} ModuleOptions */

/** @typedef {"parsedSize" | "gzipSize" | "brotliSize" | "zstdSize"} SizeType */

/**
 * @typedef {object} ModuleChartData
 * @property {string | number | undefined} id id
 * @property {string} label label
 * @property {string} path path
 * @property {number | undefined} statSize stat size
 * @property {number | undefined} parsedSize parsed size
 * @property {number | undefined} gzipSize gzip size
 * @property {number | undefined} brotliSize brotli size
 * @property {number | undefined} zstdSize zstd size
 */

export default class Module extends Node {
  /**
   * @param {string} name name
   * @param {StatsModule} data data
   * @param {Node | undefined} parent parent
   * @param {ModuleOptions} opts options
   */
  constructor(name, data, parent, opts) {
    super(name, parent);
    /** @type {StatsModule} */
    this.data = data;
    /** @type {ModuleOptions} */
    this.opts = opts;
    /** @type {number | undefined} */
    this._gzipSize = undefined;
    /** @type {number | undefined} */
    this._brotliSize = undefined;
    /** @type {number | undefined} */
    this._zstdSize = undefined;
  }

  get src() {
    return this.data.parsedSrc;
  }

  set src(value) {
    this.data.parsedSrc = value;
    delete this._gzipSize;
    delete this._brotliSize;
    delete this._zstdSize;
  }

  /**
   * @returns {number} size
   */
  get size() {
    return /** @type {number} */ (this.data.size);
  }

  set size(value) {
    this.data.size = value;
  }

  get parsedSize() {
    return this.getParsedSize();
  }

  get gzipSize() {
    return this.getGzipSize();
  }

  get brotliSize() {
    return this.getBrotliSize();
  }

  get zstdSize() {
    return this.getZstdSize();
  }

  getParsedSize() {
    return this.src ? this.src.length : undefined;
  }

  getGzipSize() {
    return this.opts.compressionAlgorithm === "gzip"
      ? this.getCompressedSize("gzip")
      : undefined;
  }

  getBrotliSize() {
    return this.opts.compressionAlgorithm === "brotli"
      ? this.getCompressedSize("brotli")
      : undefined;
  }

  getZstdSize() {
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
    if (!(key in this)) {
      this[key] = this.src
        ? getCompressedSize(compressionAlgorithm, this.src)
        : undefined;
    }

    return this[key];
  }

  /**
   * @param {StatsModule} data data
   */
  mergeData(data) {
    if (data.size) {
      /** @type {number} */
      (this.size) += data.size;
    }

    if (data.parsedSrc) {
      this.src = (this.src || "") + data.parsedSrc;
    }
  }

  /**
   * @returns {ModuleChartData} module chart data
   */
  toChartData() {
    return {
      id: this.data.id,
      label: this.name,
      path: this.path,
      statSize: this.size,
      parsedSize: this.parsedSize,
      gzipSize: this.gzipSize,
      brotliSize: this.brotliSize,
      zstdSize: this.zstdSize,
    };
  }
}
