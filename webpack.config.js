const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const BundleAnalyzePlugin = require("./lib/BundleAnalyzerPlugin");

const isDev = (process.env.NODE_ENV || "production") === "development";
const needAnalyze = process.env.ANALYZE || false;

module.exports = {
  mode: process.env.NODE_ENV || "production",
  context: __dirname,
  entry: "./client/viewer",
  output: {
    path: `${__dirname}/public`,
    filename: "viewer.js",
    publicPath: "/",
  },
  resolve: {
    extensions: [".js", ".jsx"],
    alias: {
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      mobx: require.resolve("mobx/lib/mobx.es6.js"),
    },
  },
  devtool: isDev ? "eval" : "source-map",
  performance: {
    hints: false,
  },
  optimization: {
    minimize: !isDev,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: {
            comments: /copyright/iu,
          },
          safari10: true,
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/u,
        exclude: /node_modules/u,
        loader: "babel-loader",
        options: {
          babelrc: false,
          presets: [
            [
              "@babel/preset-env",
              {
                // Target browsers are specified in .browserslistrc

                modules: false,
                useBuiltIns: "usage",
                corejs: require("./package.json").devDependencies["core-js"],
                debug: true,
              },
            ],
            [
              "@babel/preset-react",
              {
                runtime: "automatic",
                importSource: "preact",
              },
            ],
          ],
          plugins: [
            "lodash",
            ["@babel/plugin-proposal-decorators", { legacy: true }],
            ["@babel/plugin-transform-class-properties", { loose: true }],
            [
              "@babel/plugin-transform-runtime",
              {
                useESModules: true,
              },
            ],
          ],
        },
      },
      {
        test: /\.css$/u,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[name]__[local]",
              },
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  require("autoprefixer"),
                  ...(!isDev ? [require("cssnano")()] : []),
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/u,
        type: "asset/inline",
      },
    ],
  },
  plugins: ((plugins) => {
    if (!isDev) {
      if (needAnalyze) {
        plugins.push(
          new BundleAnalyzePlugin({
            generateStatsFile: true,
          }),
        );
      }

      plugins.push(
        new webpack.DefinePlugin({
          process: JSON.stringify({
            env: {
              NODE_ENV: "production",
            },
          }),
          // Fixes "ModuleConcatenation bailout" for some modules (e.g. Preact and MobX)
          global: "undefined",
        }),
      );
    }

    return plugins;
  })([]),
};
