const fs = require("fs");
const { spawn } = require("child_process");

const ROOT = `${__dirname}/dev-server`;
const WEBPACK_CONFIG_PATH = `${ROOT}/webpack.config.js`;
const webpackConfig = require(WEBPACK_CONFIG_PATH);

describe("Webpack Dev Server", function () {
  beforeAll(deleteOutputDirectory);
  afterEach(deleteOutputDirectory);

  const timeout = 15000;
  jest.setTimeout(timeout);

  it("should save report file to the output directory", function (done) {
    const startedAt = Date.now();

    const devServer = spawn(
      `${__dirname}/../node_modules/.bin/webpack-dev-server`,
      ["--config", WEBPACK_CONFIG_PATH],
      {
        cwd: ROOT,
      },
    );

    const reportCheckIntervalId = setInterval(() => {
      if (fs.existsSync(`${webpackConfig.output.path}/report.html`)) {
        finish();
      } else if (Date.now() - startedAt > timeout - 1000) {
        finish(
          `report file wasn't found in "${webpackConfig.output.path}" directory`,
        );
      }
    }, 300);

    function finish(errorMessage) {
      clearInterval(reportCheckIntervalId);
      devServer.kill();
      done(errorMessage ? new Error(errorMessage) : null);
    }
  });
});

async function deleteOutputDirectory() {
  await fs.promises.rm(webpackConfig.output.path, { force: true, recursive: true });
}
