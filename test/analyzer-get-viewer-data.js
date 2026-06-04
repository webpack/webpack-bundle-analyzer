const analyzer = require("../src/analyzer");

describe("getViewerData", () => {
  it("handles child stats when the root child has no assets", () => {
    const chartData = analyzer.getViewerData(
      {
        assets: [],
        children: [
          {
            chunks: [],
            modules: [],
          },
          {
            assets: [
              {
                chunks: [1],
                name: "child.js",
                size: 12,
              },
            ],
            chunks: [
              {
                id: 1,
                modules: [
                  {
                    chunks: [1],
                    id: 1,
                    identifier: "./child.js",
                    name: "./child.js",
                    size: 12,
                  },
                ],
              },
            ],
          },
        ],
      },
      null,
    );

    expect(chartData).toMatchObject([
      {
        label: "child.js",
        statSize: 12,
      },
    ]);
  });
});
