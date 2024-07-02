import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const NODE_ENV = process.env.NODE_ENV || "production";

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(DIR_NAME, "..");

(async () => {
  await build({
    entryPoints: ["discord-embed-proxy.ts"],
    bundle: true,
    packages: "bundle",
    minify: NODE_ENV === "production",
    sourcemap: false,
    target: ["node18"],
    outdir: path.join(PROJECT_ROOT, "dist-node"),
    define: {
      "process.env.NODE_ENV": JSON.stringify(NODE_ENV),
    },
    platform: "node",
    external: ["./lib-cov/fluent-ffmpeg"],
    format: "esm",
    banner: {
      js: `
// fix for Error: Dynamic require of "stream" is not supported
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// fix for ReferenceError: __dirname is not defined
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`,
    },
  });
})();
