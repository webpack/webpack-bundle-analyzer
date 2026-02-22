import Node from "./Node.js";

/** @typedef {import("./Folder").default} Folder */
/** @typedef {import("./Module").default} Module */
/** @typedef {import("./Module").ModuleChartData} ModuleChartData */
/** @typedef {import("./ConcatenatedModule").default} ConcatenatedModule */
/** @typedef {import("./ContentModule").default} ContentModule */
/** @typedef {import("./ContentFolder").default} ContentFolder */
/** @typedef {import("./ContentFolder").ContentFolderChartData} ContentFolderChartData */
/** @typedef {import("./Folder").FolderChartData} FolderChartData */

/**
 * @typedef {object} BaseFolderChartData
 * @property {string} label label
 * @property {string} path path
 * @property {number} statSize stat size
 * @property {(FolderChartData | ModuleChartData | ContentFolderChartData)[]} groups groups
 */

/** @typedef {Module | ContentModule | ConcatenatedModule | ContentFolder | Folder} Children */

export default class BaseFolder extends Node {
  /**
   * @param {string} name name
   * @param {Node=} parent parent
   */
  constructor(name, parent) {
    super(name, parent);
    /** @type {Record<string, Children>} */
    this.children = Object.create(null);
  }

  /**
   * @returns {string} src
   */
  get src() {
    if (!Object.hasOwn(this, "_src")) {
      this._src = this.walk(
        (node, src) => (src += node.src || ""),
        /** @type {string} */ (""),
        false,
      );
    }

    return /** @type {string} */ (this._src);
  }

  /**
   * @returns {number} size
   */
  get size() {
    if (!Object.hasOwn(this, "_size")) {
      this._size = this.walk(
        (node, size) => size + node.size,
        /** @type {number} */ (0),
        false,
      );
    }

    return /** @type {number} */ (this._size);
  }

  /**
   * @param {string} name name
   * @returns {Children} child
   */
  getChild(name) {
    return this.children[name];
  }

  /**
   * @param {Module | ContentModule | ConcatenatedModule} module module
   */
  addChildModule(module) {
    const { name } = module;
    const currentChild = this.children[name];

    // For some reason we already have this node in children and it's a folder.
    if (currentChild && currentChild instanceof BaseFolder) return;

    if (currentChild) {
      // We already have this node in children and it's a module.
      // Merging it's data.
      currentChild.mergeData(module.data);
    } else {
      // Pushing new module
      module.parent = this;
      this.children[name] = module;
    }

    delete this._size;
    delete this._src;
  }

  /**
   * @param {ContentFolder | Folder} folder folder
   * @returns {ContentFolder | Folder} folder
   */
  addChildFolder(folder) {
    folder.parent = this;
    this.children[folder.name] = folder;
    delete this._size;
    delete this._src;

    return folder;
  }

  /**
   * @template T
   * @param {(node: Children, state: T, stop: (state: T) => void) => T} walker walker function
   * @param {T} state state state
   * @param {boolean | ((state: T) => T)=} deep true when need to deep walk, otherwise false
   * @returns {T} state
   */
  walk(walker, state = /** @type T */ ({}), deep = true) {
    let stopped = false;

    /**
     * @param {T} finalState final state
     * @returns {T} final state
     */
    function stop(finalState) {
      stopped = true;
      return finalState;
    }

    for (const child of Object.values(this.children)) {
      state =
        deep && /** @type {BaseFolder} */ (child).walk
          ? /** @type {BaseFolder} */ (child).walk(walker, state, stop)
          : walker(child, state, stop);

      if (stopped) return /** @type {T} */ (false);
    }

    return state;
  }

  mergeNestedFolders() {
    if (!this.isRoot) {
      let childNames;

      while ((childNames = Object.keys(this.children)).length === 1) {
        const [childName] = childNames;
        const onlyChild = this.children[childName];

        if (onlyChild instanceof this.constructor) {
          this.name += `/${onlyChild.name}`;
          this.children = /** @type {BaseFolder} */ (onlyChild).children;
        } else {
          break;
        }
      }
    }

    this.walk(
      (child, state) => {
        child.parent = this;

        if (
          /** @type {Folder | ContentFolder | ConcatenatedModule} */
          (child).mergeNestedFolders
        ) {
          /** @type {Folder | ContentFolder | ConcatenatedModule} */
          (child).mergeNestedFolders();
        }

        return state;
      },
      null,
      false,
    );
  }

  /**
   * @returns {BaseFolderChartData} base folder chart data
   */
  toChartData() {
    return {
      label: this.name,
      path: this.path,
      statSize: this.size,
      groups: Object.values(this.children).map((child) => child.toChartData()),
    };
  }
}
