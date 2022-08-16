import AsyncLock from "async-lock";
import { execFile } from "child_process";
import concat from "concat-stream";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import memoizee from "memoizee";
import path from "path";
import url, { fileURLToPath } from "url";
import { promisify } from "util";

const PORT = process.env.PORT || 8080;

const DISCORD_USER_AGENT =
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
const VIDEO_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11.6; rv:92.0) Gecko/20100101 Firefox/92.0";

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIR_NAME, "..");

const CHATSOUNDS_CLI = path.join(PROJECT_DIR, "chatsounds-cli");
const OUTPUT_WAV = "./output.wav";

ffmpeg.setFfmpegPath(ffmpegPath);

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

const getChatsoundBuffer = memoizee(
  async (input: string): Promise<Buffer | null> =>
    lock.acquire("bap", async () => {
      try {
        console.log("exec", { input });

        try {
          await fs.promises.unlink(OUTPUT_WAV);
        } catch {
          //
        }

        const cmd = await execFileAsync(CHATSOUNDS_CLI, [input]);
        console.log(cmd.stdout);
        console.warn(cmd.stderr);

        if (await exists(OUTPUT_WAV)) {
          const buffer = await new Promise<Buffer>((resolve, reject) => {
            ffmpeg(OUTPUT_WAV)
              .inputOptions(["-hide_banner", "-loglevel", "warning"])
              .input("color=c=black:s=120x120")
              .inputFormat("lavfi")
              .addOutputOptions(["-shortest"])
              .outputFormat("webm")
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

app.get("/", async (req, res, next) => {
  const { search } = url.parse(req.url);
  const input = search?.slice(1).replace(/\+/g, " ");
  const userAgent = req.headers["user-agent"] || "";

  if (
    input &&
    (userAgent.includes(DISCORD_USER_AGENT) ||
      userAgent.includes(VIDEO_USER_AGENT))
  ) {
    console.log({ input });

    const buffer = await getChatsoundBuffer(input);
    if (buffer?.length) {
      res.type("webm").send(buffer);
      return;
    }

    console.warn("buffer null or empty");
    res.status(503).send();
    return;
  }

  next();
});

app.use(express.static(path.join(PROJECT_DIR, "dist")));

app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});
