import { Classes } from "@blueprintjs/core";
import puppeteer, { Browser, Page } from "puppeteer";

describe("end-to-end", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      // fix for:
      // FATAL:setuid_sandbox_host.cc(163)] The SUID sandbox helper binary was found, but is not configured correctly.
      // Rather than run without sandboxing I'm aborting now.
      // You need to make sure that /nix/store/...-chromium-...-sandbox/bin/__chromium-suid-sandbox is owned by root and has mode 4755.
      args: ["--no-sandbox"],
      dumpio: true,
    });
    page = await browser.newPage();
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "dark" },
    ]);
  });
  afterAll(async () => {
    await page?.close();
    await browser?.close();
  });

  it("loads page", async () => {
    const response = await page.goto("http://localhost:8080", {
      waitUntil: "networkidle0",
    });
    expect(response?.ok()).toBe(true);

    expect(Buffer.from(await page.screenshot())).toMatchImageSnapshot();
  });

  it("loads sounds", async () => {
    await page.click("button");
    const input = await page.waitForSelector("input");
    await input?.evaluate((input) => input.blur());

    await page.waitForSelector(`.${Classes.TOAST} button`, { hidden: true });

    expect(Buffer.from(await page.screenshot())).toMatchImageSnapshot();
  }, 35000);

  it("can give wav file", async () => {
    const response = await page.goto(
      "http://localhost:8080/?ah-hello-gordon-freeman-its-good-to-see-you.wav",
      { waitUntil: "networkidle0" },
    );
    console.log(response);
    expect(response?.ok()).toBe(true);

    const headers = response?.headers();
    expect(headers).toHaveProperty("content-type", "audio/wav");
    expect(headers).toHaveProperty("content-length", "1225372");
  });

  it("can give mp4 file", async () => {
    const response = await page.goto(
      "http://localhost:8080/?ah-hello-gordon-freeman-its-good-to-see-you.mp4",
      { waitUntil: "networkidle0" },
    );
    console.log(response);
    expect(response?.ok()).toBe(true);

    const headers = response?.headers();
    expect(headers).toHaveProperty("content-type", "video/mp4");
    expect(parseInt(headers?.["content-length"] || "0", 10)).toBeGreaterThan(
      60000,
    );
  });
});
