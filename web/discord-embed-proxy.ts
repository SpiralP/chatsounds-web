import AsyncLock from "async-lock";
import { execFile } from "child_process";
import concat from "concat-stream";
import express, { Response } from "express";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import memoizee from "memoizee";
import path from "path";
import url, { fileURLToPath } from "url";
import { promisify } from "util";
import { decodeComponent } from "./src/utils.js";

const PORT = process.env.PORT || 8080;

const DISCORD_USER_AGENT =
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
const VIDEO_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:38.0) Gecko/20100101 Firefox/38.0";

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIR_NAME, "..");

const CHATSOUNDS_CLI =
  process.platform === "win32" ? "chatsounds-cli.exe" : "chatsounds-cli";

const OUTPUT_WAV = "./output.wav";

ffmpeg.setFfmpegPath("ffmpeg");

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

          return await new Promise<Buffer>((resolve, reject) => {
            let f = ffmpeg(OUTPUT_WAV).inputOptions([
              "-hide_banner",
              "-loglevel",
              "warning",
            ]);

            if (ext === "mp4" || ext === "webm") {
              // add a black video for video formats
              f = f
                .input("color=c=black:s=120x120")
                .inputFormat("lavfi")
                .addOutputOptions(["-shortest"]);

              if (ext === "mp4") {
                f = f.addOutputOptions(["-movflags", "empty_moov"]);
              }
            }

            f.outputFormat(ext)
              .on("error", reject)
              .on("stderr", console.warn)
              .pipe(concat(resolve));
          });
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
    res.type(ext).send(buffer);
  } else {
    console.warn("buffer null or empty");
    res.status(503).send();
  }
}

app.get("/", async (req, res, next) => {
  const { search } = url.parse(req.url);
  const input = decodeComponent(search?.slice(1) || "");
  const userAgent = req.headers["user-agent"] || "";

  console.log({ url: req.url, input, userAgent });
  if (input) {
    const match = /^(.+)\.(.+?)$/.exec(input) || [];
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
      const url = `/media.mp4${search || ""}`;
      res.type("html");
      res.send(`<!DOCTYPE html><html lang="en"><head>
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

app.get("/media.mp4", async (req, res) => {
  const { search } = url.parse(req.url);
  const input = decodeComponent(search?.slice(1) || "");

  await respondMedia(input, "mp4", res);
});

app.use(express.static(path.join(PROJECT_DIR, "dist")));

app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});
