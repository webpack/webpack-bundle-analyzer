/** @typedef {import("./BundleAnalyzerPlugin").EXPECTED_ANY} EXPECTED_ANY */

/** @typedef {"debug" | "info" | "warn" | "error" | "silent"} Level */

/** @type {Level[]} */
const LEVELS = ["debug", "info", "warn", "error", "silent"];

/** @type {Map<Level, string>} */
const LEVEL_TO_CONSOLE_METHOD = new Map([
  ["debug", "log"],
  ["info", "log"],
  ["warn", "log"],
]);

class Logger {
  /** @type {Level[]} */
  static levels = LEVELS;

  /** @type {Level} */
  static defaultLevel = "info";

  /**
   * @param {Level=} level level
   */
  constructor(level = Logger.defaultLevel) {
    /** @type {Set<Level>} */
    this.activeLevels = new Set();
    this.setLogLevel(level);
  }

  /**
   * @param {Level} level level
   */
  setLogLevel(level) {
    const levelIndex = LEVELS.indexOf(level);

    if (levelIndex === -1) {
      throw new Error(
        `Invalid log level "${level}". Use one of these: ${LEVELS.join(", ")}`,
      );
    }

    this.activeLevels.clear();

    for (const [i, level] of LEVELS.entries()) {
      if (i >= levelIndex) this.activeLevels.add(level);
    }
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  debug(...args) {
    if (!this.activeLevels.has("debug")) return;
    this._log("debug", ...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  info(...args) {
    if (!this.activeLevels.has("info")) return;
    this._log("info", ...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  error(...args) {
    if (!this.activeLevels.has("error")) return;
    this._log("error", ...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  warn(...args) {
    if (!this.activeLevels.has("warn")) return;
    this._log("warn", ...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {Level} level level
   * @param {T} args args
   */
  _log(level, ...args) {
    // eslint-disable-next-line no-console
    console[
      /** @type {Exclude<Level, "silent">} */
      (LEVEL_TO_CONSOLE_METHOD.get(level) || level)
    ](...args);
  }
}

module.exports = Logger;
