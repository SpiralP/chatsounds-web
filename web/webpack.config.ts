import CopyPlugin from "copy-webpack-plugin";
import { execa } from "execa";
import glob from "glob";
import path from "path";

import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import ReactRefreshTypeScript from "react-refresh-typescript";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { fileURLToPath } from "url";
import { promisify } from "util";
import webpack, { WebpackPluginInstance } from "webpack";
import "webpack-dev-server";

const globAsync = promisify(glob);

const isDevelopment = process.env.NODE_ENV !== "production";
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
      execa("yarn", ["build:wasm", isDevelopment ? "--dev" : "--release"], {
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
              before: [isDevelopment && ReactRefreshTypeScript()].filter(
                Boolean
              ),
            }),
            transpileOnly: isDevelopment,
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
    isDevelopment && new ReactRefreshWebpackPlugin(),
  ].filter((a): a is WebpackPluginInstance => Boolean(a)),
  mode: isDevelopment ? "development" : "production",
  experiments: {
    asyncWebAssembly: true,
  },
  devServer: {
    hot: true,
  },
};

export default config;
