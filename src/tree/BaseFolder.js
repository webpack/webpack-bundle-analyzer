import Node from "./Node.js";

export default class BaseFolder extends Node {
  constructor(name, parent) {
    super(name, parent);
    this.children = Object.create(null);
  }

  get src() {
    if (!Object.hasOwn(this, "_src")) {
      this._src = this.walk((node, src) => (src += node.src || ""), "", false);
    }

    return this._src;
  }

  get size() {
    if (!Object.hasOwn(this, "_size")) {
      this._size = this.walk((node, size) => size + node.size, 0, false);
    }

    return this._size;
  }

  getChild(name) {
    return this.children[name];
  }

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

  addChildFolder(folder) {
    folder.parent = this;
    this.children[folder.name] = folder;
    delete this._size;
    delete this._src;

    return folder;
  }

  walk(walker, state = {}, deep = true) {
    let stopped = false;

    function stop(finalState) {
      stopped = true;
      return finalState;
    }

    for (const child of Object.values(this.children)) {
      state =
        deep && child.walk
          ? child.walk(walker, state, stop)
          : walker(child, state, stop);

      if (stopped) return false;
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
          this.children = onlyChild.children;
        } else {
          break;
        }
      }
    }

    this.walk(
      (child) => {
        child.parent = this;

        if (child.mergeNestedFolders) {
          child.mergeNestedFolders();
        }
      },
      null,
      false,
    );
  }

  toChartData() {
    return {
      label: this.name,
      path: this.path,
      statSize: this.size,
      groups: Object.values(this.children).map((child) => child.toChartData()),
    };
  }
}
