import Node from './Node';
import {getCompressedSize} from '../sizeUtils';

export default class Module extends Node {

  constructor(name, data, parent, opts) {
    super(name, parent);
    this.data = data;
    this.opts = opts;
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

  get size() {
    return this.data.size;
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
    return this.opts.compressionAlgorithm === 'gzip' ? this.getCompressedSize('gzip') : undefined;
  }

  getBrotliSize() {
    return this.opts.compressionAlgorithm === 'brotli' ? this.getCompressedSize('brotli') : undefined;
  }

  getZstdSize() {
    return this.opts.compressionAlgorithm === 'zstd' ? this.getCompressedSize('zstd') : undefined;
  }

  getCompressedSize(compressionAlgorithm) {
    const key = `_${compressionAlgorithm}Size`;
    if (!(key in this)) {
      this[key] = this.src ? getCompressedSize(compressionAlgorithm, this.src) : undefined;
    }

    return this[key];
  }

  mergeData(data) {
    if (data.size) {
      this.size += data.size;
    }

    if (data.parsedSrc) {
      this.src = (this.src || '') + data.parsedSrc;
    }
  }

  toChartData() {
    return {
      id: this.data.id,
      label: this.name,
      path: this.path,
      statSize: this.size,
      parsedSize: this.parsedSize,
      gzipSize: this.gzipSize,
      brotliSize: this.brotliSize,
      zstdSize: this.zstdSize
    };
  }

};
