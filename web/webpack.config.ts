import CopyPlugin from "copy-webpack-plugin";
import { execa } from "execa";
import glob from "glob";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import webpack from "webpack";

const globAsync = promisify(glob);

const { NODE_ENV } = process.env;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

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
      execa(
        "yarn",
        ["build:wasm", NODE_ENV === "production" ? "--release" : "--dev"],
        {
          stderr: "inherit",
          stdout: "inherit",
        }
      ).catch(() => {
        // everything already screams
      });
    compiler.hooks.run.tapPromise("build wasm", async (compiler) => {
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
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new CopyPlugin({ patterns: ["./src/index.html"] }),
    AutoBuildWasmPlugin,
  ],
  mode: NODE_ENV === "production" ? "production" : "development",
  experiments: {
    asyncWebAssembly: true,
  },
};

export default config;
