const Logger = require("../src/Logger");

class TestLogger extends Logger {
  constructor(level) {
    super(level);
    this.logs = [];
  }

  clear() {
    this.logs = [];
  }

  _log(level, ...args) {
    this.logs.push([level, ...args]);
  }
}

function expectLoggerLevel(logger, level) {
  logger.clear();

  const levels = Logger.levels.filter((level) => level !== "silent");

  for (const level of levels) {
    logger[level]("msg1", "msg2");
  }

  const expectedLogs = levels
    .filter(
      (testLevel) =>
        Logger.levels.indexOf(testLevel) >= Logger.levels.indexOf(level),
    )
    .map((testLevel) => [testLevel, "msg1", "msg2"]);

  expect(logger.logs).toEqual(expectedLogs);
}

function invalidLogLevelMessage(level) {
  return `Invalid log level "${level}". Use one of these: ${Logger.levels.join(", ")}`;
}

let logger;

describe("Logger", () => {
  describe("level", () => {
    for (const testingLevel of Logger.levels) {
      /* eslint-disable no-loop-func */
      describe(`"${testingLevel}"`, () => {
        beforeEach(() => {
          logger = new TestLogger(testingLevel);
        });

        for (const level of Logger.levels.filter(
          (level) => level !== "silent",
        )) {
          if (
            Logger.levels.indexOf(level) >= Logger.levels.indexOf(testingLevel)
          ) {
            it(`should log "${level}" message`, () => {
              logger[level]("msg1", "msg2");
              expect(logger.logs).toEqual([[level, "msg1", "msg2"]]);
            });
          } else {
            it(`should not log "${level}" message`, () => {
              logger[level]("msg1", "msg2");
              expect(logger.logs).toHaveLength(0);
            });
          }
        }
      });
    }

    it('should be set to "info" by default', () => {
      logger = new TestLogger();
      expectLoggerLevel(logger, "info");
    });

    it("should allow to change level", () => {
      logger = new TestLogger("warn");
      expectLoggerLevel(logger, "warn");
      logger.setLogLevel("info");
      expectLoggerLevel(logger, "info");
      logger.setLogLevel("silent");
      expectLoggerLevel(logger, "silent");
    });

    it("should throw if level is invalid on instance creation", () => {
      expect(() => new TestLogger("invalid")).toThrow(
        invalidLogLevelMessage("invalid"),
      );
    });

    it("should throw if level is invalid on `setLogLevel`", () => {
      expect(() => new TestLogger().setLogLevel("invalid")).toThrow(
        invalidLogLevelMessage("invalid"),
      );
    });
  });
});
