import CopyPlugin from "copy-webpack-plugin";
// import { execa } from "execa";
import glob from "glob";
import path from "path";

import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { execa } from "execa";
import ReactRefreshTypeScript from "react-refresh-typescript";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { fileURLToPath } from "url";
import { promisify } from "util";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";

const globAsync = promisify(glob);

const isProduction = process.env.NODE_ENV === "production";
const isDev = process.argv[2] === "dev";

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(DIR_NAME, "..");

const AutoBuildWasmPlugin: webpack.WebpackPluginInstance = {
  apply: (compiler) => {
    const watchedFiles = async () => {
      const files = await globAsync("**", {
        cwd: path.join(PROJECT_ROOT, "src"),
        absolute: true,
      });
      files.push(path.join(PROJECT_ROOT, "Cargo.toml"));
      files.push(path.join(PROJECT_ROOT, "Cargo.lock"));
      return files;
    };

    const build = () =>
      execa("yarn", ["build:wasm", isProduction ? "--release" : "--dev"], {
        stderr: "inherit",
        stdout: "inherit",
      }).catch(() => {
        // everything already screams
      });

    compiler.hooks.run.tapPromise("build wasm", async (_compiler) => {
      await build();
    });

    compiler.hooks.watchRun.tapPromise("build wasm", async (compiler) => {
      const srcFiles = await watchedFiles();
      if (
        !compiler.modifiedFiles ||
        srcFiles.find((path) => compiler.modifiedFiles.has(path))
      ) {
        await build();
      }
    });

    compiler.hooks.afterCompile.tapPromise(
      "build wasm",
      async (compilation) => {
        const srcFiles = await watchedFiles();
        compilation.fileDependencies.addAll(srcFiles);
      }
    );
  },
};

const config: webpack.Configuration = {
  entry: "./src/index.tsx",
  output: {
    path: path.join(PROJECT_ROOT, "dist"),
    filename: "index.js",
  },
  devtool: "inline-source-map",
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
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })],
  },
  plugins: [
    new CopyPlugin({ patterns: ["./src/index.html"] }),
    AutoBuildWasmPlugin,
    ...(isDev ? [new ReactRefreshWebpackPlugin()] : []),
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
  server.start().catch(console.error);
} else {
  compiler.run((err, stats) => {
    if (err || stats?.hasErrors()) {
      console.error(err);
    }
  });
}
