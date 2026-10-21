const { resolve } = require("path");
var glob = require("glob");
var path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const { ProvidePlugin } = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const isProd = process.env.NODE_ENV === "production";
const isDevelopment = !isProd;

const fastRefresh = isDevelopment ? new ReactRefreshWebpackPlugin() : null;

const config = {
  mode: isProd ? "production" : "development",
  // One entry per widget. The index plugin (`index.tsx`) is loaded by RemNote
  // directly and must not be emitted as a widget bundle.
  entry: glob
    .sync("./src/widgets/*.tsx")
    .filter((el) => path.parse(el).name !== "index")
    .reduce(function (obj, el) {
      obj[path.parse(el).name] = el;
      return obj;
    }, {}),

  output: {
    path: resolve(__dirname, "dist"),
    filename: "[name].js",
    publicPath: "",
    // Mermaid is a large dependency that every widget shares via the vendor chunk.
    chunkFilename: "[id].[contenthash].js",
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  module: {
    rules: [
      // Use esbuild as a Babel alternative
      {
        test: /\.(ts|tsx|jsx|js)?$/,
        loader: "esbuild-loader",
        options: {
          loader: "tsx",
          target: "es2020",
          minify: false,
        },
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: "css-loader", options: { url: false } },
          "postcss-loader",
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "App.css",
    }),
    new HtmlWebpackPlugin({
      templateContent: `
      <body></body>
      <script type="text/javascript">
      const urlSearchParams = new URLSearchParams(window.location.search);
      const queryParams = Object.fromEntries(urlSearchParams.entries());
      const widgetName = queryParams["widgetName"];
      if (widgetName == undefined) {document.body.innerHTML+="Widget ID not specified."}

      const s = document.createElement('script');
      s.type = "module";
      s.src = widgetName+".js";
      document.body.appendChild(s);
      </script>
    `,
      filename: "index.html",
      inject: false,
    }),
    new ProvidePlugin({
      React: "react",
    }),
    new CopyPlugin({
      patterns: [{ from: "public", to: "" }],
    }),
    fastRefresh,
  ].filter(Boolean),
};

/*
 * Every widget is a separate entry, and webpack duplicates modules that multiple
 * entries depend on. Mermaid is ~1 MB, so without this it ends up embedded in
 * each widget bundle. Split it (and the other large shared dependencies) into a
 * single shared chunk instead.
 */
config.optimization = {
  ...(config.optimization || {}),
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: "vendor",
        chunks: "all",
        enforce: true,
      },
    },
  },
};

if (isProd) {
  config.optimization = {
    ...config.optimization,
    minimize: true,
    minimizer: [new TerserPlugin({}), new CssMinimizerPlugin()],
  };
} else {
  // The dev server serves this config in memory, so it must emit the shared
  // vendor chunk too — otherwise `npm run dev` would fail to load Mermaid.
  config.devServer = {
    port: 8080,
    // RemNote connects to this URL itself, so don't hijack a browser tab.
    open: false,
    hot: true,
    compress: true,
    watchFiles: ["src/**/*"],
    // Newer tools (e.g. a local browser) resolve chunks via origin URLs.
    allowedHosts: "all",
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
}

module.exports = config;
