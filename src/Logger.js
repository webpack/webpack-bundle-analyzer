/** @typedef {import("./BundleAnalyzerPlugin").EXPECTED_ANY} EXPECTED_ANY */
/** @typedef {ReturnType<import("webpack").Compiler["getInfrastructureLogger"]>} WebpackLogger */

/** @typedef {"debug" | "info" | "warn" | "error" | "silent"} Level */

/** @type {Level[]} */
const LEVELS = ["debug", "info", "warn", "error", "silent"];

/** @type {Map<Level, string>} */
const LEVEL_TO_CONSOLE_METHOD = new Map([
  ["debug", "log"],
  ["info", "log"],
  ["warn", "log"],
]);

class InfrastructureLoggerAdapter {
  /**
   * @param {WebpackLogger} infrastructureLogger infrastructure logger
   * @param {Level} userLogLevel user log level
   * @param {boolean=} suppressWarning suppress deprecation warning
   */
  constructor(infrastructureLogger, userLogLevel, suppressWarning = false) {
    const levelIndex = LEVELS.indexOf(userLogLevel);

    if (levelIndex === -1) {
      throw new Error(
        `Invalid log level "${userLogLevel}". Use one of these: ${LEVELS.join(", ")}`,
      );
    }

    /** @type {WebpackLogger} */
    this._logger = infrastructureLogger;
    /** @type {Level} */
    this._userLogLevel = userLogLevel;
    /** @type {Set<Level>} */
    this.activeLevels = new Set();
    this.setLogLevel(userLogLevel);

    if (!suppressWarning) {
      this.warn(
        "The 'logLevel' option is deprecated and will be removed in a future release. " +
          "Please use webpack's 'infrastructureLogging.level' option instead.",
      );
    }
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

    for (const [i, l] of LEVELS.entries()) {
      if (i >= levelIndex) this.activeLevels.add(l);
    }
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  error(...args) {
    if (!this.activeLevels.has("error")) return;
    this._logger.error(...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  warn(...args) {
    if (!this.activeLevels.has("warn")) return;
    this._logger.warn(...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  info(...args) {
    if (!this.activeLevels.has("info")) return;
    this._logger.info(...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  log(...args) {
    if (!this.activeLevels.has("info")) return;
    this._logger.log(...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  debug(...args) {
    if (!this.activeLevels.has("debug")) return;
    this._logger.debug(...args);
  }

  trace() {
    if (!this.activeLevels.has("debug")) return;
    this._logger.trace();
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  group(...args) {
    if (!this.activeLevels.has("info")) return;
    this._logger.group(...args);
  }

  groupEnd() {
    if (!this.activeLevels.has("info")) return;
    this._logger.groupEnd();
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  groupCollapsed(...args) {
    if (!this.activeLevels.has("info")) return;
    this._logger.groupCollapsed(...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  status(...args) {
    if (!this.activeLevels.has("info")) return;
    this._logger.status(...args);
  }

  clear() {
    if (!this.activeLevels.has("info")) return;
    this._logger.clear();
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  profile(...args) {
    if (!this.activeLevels.has("debug")) return;
    this._logger.profile(...args);
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {T} args args
   */
  profileEnd(...args) {
    if (!this.activeLevels.has("debug")) return;
    this._logger.profileEnd(...args);
  }

  /**
   * @param {string | (() => string)} name name
   * @returns {InfrastructureLoggerAdapter} child logger
   */
  getChildLogger(name) {
    return new InfrastructureLoggerAdapter(
      this._logger.getChildLogger(name),
      this._userLogLevel,
      true,
    );
  }

  /**
   * @template {EXPECTED_ANY[]} T
   * @param {undefined | boolean} condition condition
   * @param {T} args args
   */
  assert(condition, ...args) {
    this._logger.assert(condition, ...args);
  }

  /**
   * @param {string} label label
   */
  time(label) {
    if (!this.activeLevels.has("info")) return;
    this._logger.time(label);
  }

  /**
   * @param {string} label label
   */
  timeLog(label) {
    if (!this.activeLevels.has("info")) return;
    this._logger.timeLog(label);
  }

  /**
   * @param {string} label label
   */
  timeEnd(label) {
    if (!this.activeLevels.has("info")) return;
    this._logger.timeEnd(label);
  }

  /**
   * @param {string} label label
   */
  timeAggregate(label) {
    this._logger.timeAggregate(label);
  }

  /**
   * @param {string} label label
   */
  timeAggregateEnd(label) {
    this._logger.timeAggregateEnd(label);
  }
}

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
   * @param {T} args args
   */
  log(...args) {
    if (!this.activeLevels.has("info")) return;
    this._log("info", ...args);
  }

  /**
   * @param {string} label label
   */
  time(label) {
    if (!this.activeLevels.has("info")) return;
    // eslint-disable-next-line no-console
    console.time(label);
  }

  /**
   * @param {string} label label
   */
  timeEnd(label) {
    if (!this.activeLevels.has("info")) return;
    // eslint-disable-next-line no-console
    console.timeEnd(label);
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

  /**
   * @param {WebpackLogger} infrastructureLogger infrastructure logger
   * @param {Level=} userLogLevel user log level
   * @returns {WebpackLogger | InfrastructureLoggerAdapter} logger adapter
   * @param {boolean=} warned whether deprecation warning has been logged
   * @returns {WebpackLogger} logger adapter
   */
  static createInfrastructureLoggerAdapter(infrastructureLogger, userLogLevel) {
  static createInfrastructureLoggerAdapter(
    infrastructureLogger,
    userLogLevel,
    warned = false,
  ) {
    if (typeof userLogLevel === "undefined") {
      return infrastructureLogger;
    }

    return new InfrastructureLoggerAdapter(infrastructureLogger, userLogLevel);
    const levelIndex = LEVELS.indexOf(userLogLevel);

    if (levelIndex === -1) {
      throw new Error(
        `Invalid log level "${userLogLevel}". Use one of these: ${LEVELS.join(", ")}`,
      );
    }

    /** @type {Set<Level>} */
    const activeLevels = new Set();

    for (const [i, level] of LEVELS.entries()) {
      if (i >= levelIndex) activeLevels.add(level);
    }

    if (!warned && activeLevels.has("warn")) {
      infrastructureLogger.warn(
        "The 'logLevel' option is deprecated and will be removed in a future release. " +
          "Please use webpack's 'infrastructureLogging.level' option instead.",
      );
    }

    return new Proxy(infrastructureLogger, {
      get(target, prop, receiver) {
        if (prop === "activeLevels") {
          return activeLevels;
        }

        if (prop === "setLogLevel") {
          return (/** @type {Level} */ level) => {
            const idx = LEVELS.indexOf(level);

            if (idx === -1) {
              throw new Error(
                `Invalid log level "${level}". Use one of these: ${LEVELS.join(", ")}`,
              );
            }

            activeLevels.clear();

            for (const [i, l] of LEVELS.entries()) {
              if (i >= idx) activeLevels.add(l);
            }
          };
        }

        if (prop === "getChildLogger") {
          return (/** @type {string | (() => string)} */ name) =>
            Logger.createInfrastructureLoggerAdapter(
              target.getChildLogger(name),
              userLogLevel,
              true,
            );
        }

        const value = Reflect.get(target, prop, receiver);

        if (typeof value === "function") {
          const isManagedLevel =
            LEVELS.includes(/** @type {Level} */ (prop)) || prop === "log";
          const levelToCheck = prop === "log" ? "info" : prop;

          if (
            isManagedLevel &&
            !activeLevels.has(/** @type {Level} */ (levelToCheck))
          ) {
            return () => {};
          }

          return value.bind(target);
        }

        return value;
      },
    });
  }
}

module.exports = Logger;
