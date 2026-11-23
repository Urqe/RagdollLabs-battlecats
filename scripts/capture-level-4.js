import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { dualAim } from "../tests/helpers/dual-strategies.js";

const output = process.argv[2] ?? "test-results/level-4";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const size = { width: 390, height: 844 };
  const context = await browser.newContext({
    viewport: size, isMobile: true, hasTouch: true,
    recordVideo: { dir: output, size },
  });
  const page = await context.newPage();
  const video = page.video();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(async () => {
    window.battleSnapshot = (await import("/src/main.js")).getSnapshot;
    const frames = [];
    let previous;
    function sample(time) {
      if (previous !== undefined) frames.push(time - previous);
      previous = time;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
    window.captureFrames = frames;
  });
  await page.getByRole("button", { name: "Choose level" }).click();
  await page.getByRole("button", { name: /Level 4.*A Tale of Two Tails/ }).click();
  const box = await page.locator("#game").boundingBox();
  const screenX = x => box.x + x * box.width / 420;
  const y = box.y + box.height * 0.88;
  const load = () => page.evaluate(() => window.battleSnapshot());
  const highlights = {};
  let state = await load();

  for (let second = 0; second < 115 && state.mode === "playing"; second++) {
    const x = dualAim("mixed", second, state.dual.lanes, state.gates, state.dual.phalanx);
    if (Math.abs(x - state.gunX) > 2) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart", touchPoints: [{ x: screenX(state.gunX), y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x: screenX(x), y }],
      });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await page.waitForFunction(time => {
      const snapshot = window.battleSnapshot();
      return snapshot.t >= time || snapshot.mode !== "playing";
    }, second + 1 - 0.00001);
    state = await load();
    if (state.gates[0].open) highlights.release ??= state.t;
    if (state.dual.phalanx.phase === "secured") highlights.secured ??= state.dual.phalanx.since;
    if (highlights.secured && !highlights.screenshot &&
        state.dual.lanes.left.front <= 309 && state.t >= highlights.secured + 1) {
      highlights.screenshot = state.t;
      await page.screenshot({ path: join(output, "phalanx-secured.png") });
    }
    if (state.gates[5].open) highlights.surge ??= state.t;
  }
  if (state.mode !== "victory" || errors.length) {
    throw new Error(`Capture ended at ${state.t} seconds in mode ${state.mode}: ${errors.join(", ")}`);
  }
  highlights.victory = state.t;
  await page.getByRole("heading", { name: "The castle stands!" }).waitFor();
  await page.waitForTimeout(1250);
  const timing = await page.evaluate(() => {
    const frames = window.captureFrames.sort((a, b) => a - b);
    return {
      samples: frames.length,
      medianFrameMs: frames[Math.floor(frames.length / 2)],
      p95FrameMs: frames[Math.floor(frames.length * 0.95)],
    };
  });
  await context.close();
  await rename(await video.path(), join(output, "level-4-full.webm"));
  await writeFile(join(output, "capture.json"), JSON.stringify({ highlights, timing }, null, 2) + "\n");
  console.log({ highlights, timing });
} finally {
  await browser.close();
}
