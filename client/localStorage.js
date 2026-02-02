const KEY_PREFIX = "wba";

export default {
  getItem(key) {
    try {
      return JSON.parse(
        globalThis.localStorage.getItem(`${KEY_PREFIX}.${key}`),
      );
    } catch {
      return null;
    }
  },

  setItem(key, value) {
    try {
      globalThis.localStorage.setItem(
        `${KEY_PREFIX}.${key}`,
        JSON.stringify(value),
      );
    } catch {
      /* ignored */
    }
  },

  removeItem(key) {
    try {
      globalThis.localStorage.removeItem(`${KEY_PREFIX}.${key}`);
    } catch {
      /* ignored */
    }
  },
};
