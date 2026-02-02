const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "./dev-server");
const WEBPACK_CONFIG_PATH = `${ROOT}/webpack.config.js`;

const webpackConfig = require(WEBPACK_CONFIG_PATH);

const timeout = 15000;

async function deleteOutputDirectory() {
  await fs.promises.rm(webpackConfig.output.path, {
    force: true,
    recursive: true,
  });
}

describe("Webpack Dev Server", () => {
  beforeAll(deleteOutputDirectory);

  afterEach(deleteOutputDirectory);

  it("should save report file to the output directory", (done) => {
    const startedAt = Date.now();

    const devServer = spawn(
      path.resolve(__dirname, "../node_modules/.bin/webpack-dev-server"),
      ["--config", WEBPACK_CONFIG_PATH],
      {
        cwd: ROOT,
      },
    );

    function finish(errorMessage) {
      // eslint-disable-next-line no-use-before-define
      clearInterval(reportCheckIntervalId);
      devServer.kill();
      done(errorMessage ? new Error(errorMessage) : null);
    }

    const reportCheckIntervalId = setInterval(() => {
      if (
        fs.existsSync(path.resolve(webpackConfig.output.path, "./report.html"))
      ) {
        expect(true).toBe(true);
        finish();
      } else if (Date.now() - startedAt > timeout - 1000) {
        finish(
          `report file wasn't found in "${webpackConfig.output.path}" directory`,
        );
      }
    }, 300);
  });
});
