import AsyncLock from "async-lock";
import { execFile } from "child_process";
import { execa } from "execa";
import express, { Response } from "express";
import fs from "fs";
import memoizee from "memoizee";
import path from "path";
import url, { fileURLToPath } from "url";
import { promisify } from "util";
import { decodeComponent } from "./src/utils.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "8080", 10);

const DISCORD_USER_AGENT =
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
const VIDEO_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:38.0) Gecko/20100101 Firefox/38.0";

// ./dist-node/(discord-embed-proxy.ts)
const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
// ./
const PROJECT_DIR = path.resolve(DIR_NAME, "..");
// ./dist
const DIST_DIR = path.join(PROJECT_DIR, "dist");
if (!fs.existsSync(DIST_DIR)) {
  throw new Error("!dist");
}

const CHATSOUNDS_CLI =
  process.platform === "win32" ? "chatsounds-cli.exe" : "chatsounds-cli";

const OUTPUT_WAV = "./output.wav";

const execFileAsync = promisify(execFile);

async function exists(path: string) {
  return new Promise<boolean>((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

const app = express();

const lock = new AsyncLock();

const EXTENSIONS = ["mp4", "webm", "ogg", "mp3", "wav"] as const;
type Extension = (typeof EXTENSIONS)[number];

const getChatsoundBuffer = memoizee(
  async (sentence: string, ext: Extension): Promise<Buffer | null> =>
    lock.acquire("bap", async () => {
      try {
        console.log("exec", { sentence, ext });

        try {
          await fs.promises.unlink(OUTPUT_WAV);
        } catch {
          //
        }

        const cmd = await execFileAsync(CHATSOUNDS_CLI, [sentence]);
        console.log(cmd.stdout);
        console.warn(cmd.stderr);

        if (await exists(OUTPUT_WAV)) {
          if (ext === "wav") {
            return await fs.promises.readFile(OUTPUT_WAV);
          }

          const formatOptions = [];
          if (ext === "mp4" || ext === "webm") {
            // add a black video for video formats
            formatOptions.push(
              "-f",
              "lavfi",
              "-i",
              "color=c=black:s=120x120",
              "-shortest",
            );
          }
          formatOptions.push("-f", ext);
          if (ext === "mp4") {
            formatOptions.push("-movflags", "empty_moov");
          }

          const { stdout } = await execa(
            "ffmpeg",
            [
              "-hide_banner",
              "-loglevel",
              "warning",
              "-i",
              OUTPUT_WAV,
              ...formatOptions,
              "pipe:1",
            ],
            { encoding: "buffer" },
          );
          await fs.promises.unlink(OUTPUT_WAV);
          const buffer = Buffer.from(stdout);

          return buffer;
        }

        return null;
      } catch (e) {
        console.error(e);
        return null;
      }
    }),
  {
    // cache for 1 minute
    maxAge: 1000 * 60,
    promise: true,
  },
);

async function respondMedia(sentence: string, ext: Extension, res: Response) {
  const buffer = await getChatsoundBuffer(sentence, ext);
  if (buffer?.length) {
    const contentType =
      (ext === "mp4" || ext === "webm" ? "video/" : "audio/") + ext;
    res.type(contentType).send(buffer);
  } else {
    console.warn("buffer null or empty");
    res.status(503).send();
  }
}

app.get("/", async (req, res, next) => {
  const { search } = url.parse(req.url);
  const input = decodeComponent(search?.slice(1) || "");
  const userAgent = req.headers["user-agent"] || "";

  console.log("/", { url: req.url, input, userAgent });
  if (input) {
    const match = input.match(/^(.+)\.(.+?)$/) || [];
    const sentenceMatch = match[1] || "";
    const extMatch = match[2] as Extension | undefined;
    if (sentenceMatch && extMatch && EXTENSIONS.includes(extMatch)) {
      await respondMedia(sentenceMatch, extMatch, res);
      return;
    }
    if (
      userAgent.includes(DISCORD_USER_AGENT) ||
      userAgent.includes(VIDEO_USER_AGENT)
    ) {
      const url = `/media/${search?.slice(1) || ""}.mp4`;
      res.type("html").send(`<!DOCTYPE html><html lang="en"><head>
<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />

<meta property="og:video:type" content="video/mp4" />
<meta property="og:video" content="${url}" />
<meta property="og:video:secure_url" content="${url}" />
<meta property="og:video:width" content="120" />
<meta property="og:video:height" content="120" />

<meta property="twitter:card" content="player" />
<meta property="twitter:player:stream:content_type" content="video/mp4" />
<meta property="twitter:player:stream" content="${url}" />
<meta property="twitter:player:width" content="120" />
<meta property="twitter:player:height" content="120" />

</head><body></body></html>
`);
      return;
    }
  }

  next();
});

app.get("/media/:search.mp4", async (req, res, next) => {
  const { search } = req.params;
  const input = decodeComponent(search || "");

  console.log("/media/", { url: req.url, input });

  if (input) {
    await respondMedia(input, "mp4", res);
    return;
  }

  next();
});

app.use(express.static(DIST_DIR));

app.listen(PORT, HOST, () => {
  console.log(`app listening on port ${PORT}`);
});
