import AsyncLock from "async-lock";
import { execFile } from "child_process";
import concat from "concat-stream";
import express, { Response } from "express";
import ffmpegPath from "ffmpeg-static";
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
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11.6; rv:92.0) Gecko/20100101 Firefox/92.0";

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIR_NAME, "..");

const CHATSOUNDS_CLI = path.join(
  PROJECT_DIR,
  process.platform === "win32" ? "chatsounds-cli.exe" : "chatsounds-cli"
);

const OUTPUT_WAV = "./output.wav";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

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

const EXTENSIONS = ["mp4", "webm", "ogg", "mp3"] as const;
type Extension = typeof EXTENSIONS[number];
const DEFAULT_EXT: Extension = "mp4";

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
          const buffer = await new Promise<Buffer>((resolve, reject) => {
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
  }
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

  if (input) {
    const match = /^(.+)\.(.+?)$/.exec(input) || [];
    const sentenceMatch = match[1] || "";
    const extMatch = match[2] as Extension | undefined;
    if (sentenceMatch && extMatch && EXTENSIONS.includes(extMatch)) {
      await respondMedia(sentenceMatch, extMatch, res);
      return;
    }
  }

  if (
    input &&
    (userAgent.includes(DISCORD_USER_AGENT) ||
      userAgent.includes(VIDEO_USER_AGENT))
  ) {
    await respondMedia(input, DEFAULT_EXT, res);
    return;
  }

  next();
});

app.use(express.static(path.join(PROJECT_DIR, "dist")));

app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});
