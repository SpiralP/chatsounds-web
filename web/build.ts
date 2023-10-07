import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { execa } from "execa";
import { glob } from "glob";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import ReactRefreshTypeScript from "react-refresh-typescript";
import TsconfigPathsWebpackPlugin from "tsconfig-paths-webpack-plugin";
import { fileURLToPath } from "url";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";

const isProduction = process.env.NODE_ENV === "production";
const isDev = process.argv[2] === "dev";

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(DIR_NAME, "..");

const AutoBuildWasmPlugin: webpack.WebpackPluginInstance = {
  apply: (compiler) => {
    const watchedFiles = async () => {
      const files = await glob("**", {
        cwd: path.join(PROJECT_ROOT, "src"),
        absolute: true,
      });
      files.push(path.join(PROJECT_ROOT, "Cargo.toml"));
      files.push(path.join(PROJECT_ROOT, "Cargo.lock"));
      return files;
    };

    const build = () =>
      execa(
        "npm",
        ["run", "build:wasm", isProduction ? "--release" : "--dev"],
        {
          stderr: "inherit",
          stdout: "inherit",
        },
      ).catch((e) => {
        // everything already screams
        console.warn(e);
      });

    compiler.hooks.run.tapPromise("build wasm", async (_compiler) => {
      await build();
    });

    compiler.hooks.watchRun.tapPromise("build wasm", async (compiler) => {
      const srcFiles = await watchedFiles();
      if (
        !compiler.modifiedFiles ||
        srcFiles.find((path) => compiler.modifiedFiles?.has(path) || false)
      ) {
        await build();
      }
    });

    compiler.hooks.afterCompile.tapPromise(
      "build wasm",
      async (compilation) => {
        const srcFiles = await watchedFiles();
        compilation.fileDependencies.addAll(srcFiles);
      },
    );
  },
};

const config: webpack.Configuration = {
  entry: "./src/index.tsx",
  output: {
    path: path.join(PROJECT_ROOT, "dist"),
    filename: "[contenthash].js",
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            getCustomTransformers: () => ({
              before: isDev ? [ReactRefreshTypeScript()] : [],
            }),
            transpileOnly: isDev,
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    plugins: [
      new TsconfigPathsWebpackPlugin({ configFile: "./tsconfig.json" }),
    ],
  },
  plugins: [
    ...(isDev ? [AutoBuildWasmPlugin, new ReactRefreshWebpackPlugin()] : []),
    new HtmlWebpackPlugin({
      template: path.join(DIR_NAME, "src", "index.html"),
    }),
  ],
  mode: isProduction ? "production" : "development",
  experiments: {
    asyncWebAssembly: true,
  },
  devServer: {
    hot: true,
  },
};

const compiler = webpack(config);
if (isDev) {
  const server = new WebpackDevServer(config.devServer, compiler);
  server.start().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  compiler.run((err, stats) => {
    if (err || stats?.hasErrors()) {
      console.error(err, stats?.toString());
      process.exit(1);
    }
  });
}
