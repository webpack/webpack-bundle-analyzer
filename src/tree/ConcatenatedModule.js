import ContentFolder from "./ContentFolder.js";
import ContentModule from "./ContentModule.js";
import Module from "./Module.js";
import { getModulePathParts } from "./utils.js";

/** @typedef {import("webpack").StatsModule} StatsModule */
/** @typedef {import("./Node").default} NodeType */
/** @typedef {import("./Module").ModuleChartData} ModuleChartData */
/** @typedef {import("./Module").SizeType} SizeType */
/** @typedef {import("./Folder").default} Folder */
/** @typedef {import("./BaseFolder").Children} Children */
/** @typedef {import("./ContentFolder").ContentFolderChartData} ContentFolderChartData */
/** @typedef {import("./ContentModule").ContentModuleChartData} ContentModuleChartData */
/** @typedef {import("../sizeUtils").Algorithm} CompressionAlgorithm */

/**
 * @typedef {object} OwnConcatenatedModuleChartData
 * @property {boolean} concatenated true when concatenated, otherwise false
 * @property {(ConcatenatedModuleChartData | ContentFolderChartData | ContentModuleChartData)[]} groups groups
 */

/** @typedef {ModuleChartData & OwnConcatenatedModuleChartData} ConcatenatedModuleChartData */

export default class ConcatenatedModule extends Module {
  /**
   * @param {string} name name
   * @param {StatsModule} data data
   * @param {NodeType} parent parent
   * @param {{ compressionAlgorithm: CompressionAlgorithm }} opts options
   */
  constructor(name, data, parent, opts) {
    super(name, data, parent, opts);
    this.name += " (concatenated)";
    /** @type {Record<string, ConcatenatedModule | ContentModule | ContentFolder>} */
    this.children = Object.create(null);
    this.fillContentModules();
  }

  get parsedSize() {
    return this.getParsedSize() ?? this.getEstimatedSize("parsedSize");
  }

  get gzipSize() {
    return this.getGzipSize() ?? this.getEstimatedSize("gzipSize");
  }

  get brotliSize() {
    return this.getBrotliSize() ?? this.getEstimatedSize("brotliSize");
  }

  get zstdSize() {
    return this.getZstdSize() ?? this.getEstimatedSize("zstdSize");
  }

  /**
   * @param {SizeType} sizeType size type
   * @returns {number | undefined} size
   */
  getEstimatedSize(sizeType) {
    const parentModuleSize = /** @type {Folder} */ (this.parent)[sizeType];

    if (parentModuleSize !== undefined) {
      return Math.floor(
        (this.size / /** @type {Folder} */ (this.parent).size) *
          parentModuleSize,
      );
    }
  }

  fillContentModules() {
    for (const moduleData of this.data.modules || []) {
      this.addContentModule(moduleData);
    }
  }

  /**
   * @param {StatsModule} moduleData module data
   */
  addContentModule(moduleData) {
    const pathParts = getModulePathParts(moduleData);

    if (!pathParts) {
      return;
    }

    const [folders, fileName] = [
      pathParts.slice(0, -1),
      pathParts[pathParts.length - 1],
    ];
    /** @type {ConcatenatedModule | ContentFolder} */
    let currentFolder = this;

    for (const folderName of folders) {
      /** @type {Children} */
      let childFolder = currentFolder.getChild(folderName);

      if (!childFolder) {
        childFolder = currentFolder.addChildFolder(
          new ContentFolder(folderName, this),
        );
      }

      currentFolder =
        /** @type {ConcatenatedModule | ContentFolder} */
        (childFolder);
    }

    const ModuleConstructor = moduleData.modules
      ? ConcatenatedModule
      : ContentModule;
    const module = new ModuleConstructor(fileName, moduleData, this, this.opts);
    currentFolder.addChildModule(module);
  }

  /**
   * @param {string} name name
   * @returns {ConcatenatedModule | ContentModule | ContentFolder} child folder
   */
  getChild(name) {
    return this.children[name];
  }

  /**
   * @param {ConcatenatedModule | ContentModule} module child module
   */
  addChildModule(module) {
    module.parent = this;
    this.children[module.name] = module;
  }

  /**
   * @param {ContentFolder} folder child folder
   * @returns {ContentFolder} child folder
   */
  addChildFolder(folder) {
    folder.parent = this;
    this.children[folder.name] = folder;
    return folder;
  }

  mergeNestedFolders() {
    for (const child of Object.values(this.children)) {
      if (
        /** @type {Folder | ContentFolder | ConcatenatedModule} */
        (child).mergeNestedFolders
      ) {
        /** @type {Folder | ContentFolder | ConcatenatedModule} */
        (child).mergeNestedFolders();
      }
    }
  }

  /**
   * @returns {ConcatenatedModuleChartData} chart data
   */
  toChartData() {
    return {
      ...super.toChartData(),
      concatenated: true,
      groups: Object.values(this.children).map((child) => child.toChartData()),
    };
  }
}
