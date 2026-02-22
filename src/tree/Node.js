export default class Node {
  /**
   * @param {string} name name
   * @param {Node=} parent parent
   */
  constructor(name, parent) {
    /** @type {string} */
    this.name = name;
    /** @type {Node | undefined} */
    this.parent = parent;
  }

  get path() {
    /** @type {string[]} */
    const path = [];
    /** @type {Node | undefined} */
    let node = this;

    while (node) {
      path.push(node.name);
      node = node.parent;
    }

    return path.reverse().join("/");
  }

  get isRoot() {
    return !this.parent;
  }
}
