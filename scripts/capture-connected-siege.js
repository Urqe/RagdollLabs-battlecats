import { execFileSync } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { dualAim } from "../tests/helpers/dual-strategies.js";

const output = process.argv[2] ?? "test-results/connected-siege";
const viewport = { width: 390, height: 844 };
const base = "http://127.0.0.1:4173";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
function reel(source, title, ...segments) {
  const inputs = segments.flatMap(([start, duration]) => [
    "-ss", String(Math.max(0, start)), "-t", String(duration), "-i", join(output, source),
  ]);
  const filter = segments.length === 1 ? ["-vf", "fps=30"] : [
    "-filter_complex", segments.map((_, index) => `[${index}:v]`).join("") +
      `concat=n=${segments.length}:v=1:a=0,fps=30`,
  ];
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...inputs, ...filter, "-an",
    "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-deadline", "realtime",
    "-cpu-used", "5", join(output, title)]);
}

async function capture(connected) {
  const context = await browser.newContext({
    viewport, isMobile: true, hasTouch: true,
    recordVideo: { dir: output, size: viewport },
  });
  const page = await context.newPage();
  const recordingStart = performance.now();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + (connected ? "/?fixture=connected-siege" : ""));
  await page.evaluate(async () => {
    const { getSnapshot, getConnectedFrame } = await import("/src/main.js");
    window.readBattle = getSnapshot;
    window.readConnectedFrame = getConnectedFrame;
    window.battleFrames = [];
    window.videoOrigin = performance.now();
    let last = 0;
    function sample(now) {
      const frame = getConnectedFrame();
      if (frame && last && window.battleFrames.length < 14000)
        window.battleFrames.push({ ...frame, wall: now - window.videoOrigin, duration: now - last });
      last = now;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  const origin = (performance.now() - recordingStart) / 1000;
  await page.getByRole("button", { name: "Choose level" }).click();
  await page.getByRole("button", { name: connected ? /Level 4.*A Tale of Two Tails/ : /Level 1.*The Last Stand/ }).click();
  const start = (performance.now() - recordingStart) / 1000;
  const check = () => page.evaluate(() => window.readBattle());

  if (connected) {
    const client = await context.newCDPSession(page);
    const box = await page.locator("#game").boundingBox();
    const point = x => ({ x: box.x + x * box.width / 420, y: box.y + box.height * 0.88 });
    let state = await check();
    for (let second = 0; second < 125 && state.mode === "playing"; second++) {
      const x = dualAim("mixed", second, state.dual.lanes, state.gates, state.dual.phalanx);
      if (Math.abs(x - state.gunX) > 2) {
        await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(state.gunX)] });
        await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(x)] });
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      await page.waitForFunction(time => {
        const frame = window.readConnectedFrame();
        return frame.time >= time || frame.mode !== "playing";
      }, second + 1 - 1e-7);
      state = await check();
    }
    if (state.mode !== "victory") throw new Error(`Replay ended in ${state.mode} at ${state.t}s`);
    await page.getByRole("heading", { name: "The castle stands!" }).waitFor();
    await page.waitForTimeout(850);
  } else {
    await page.waitForFunction(() => window.readBattle().t >= 16);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  const frames = await page.evaluate(() => window.battleFrames);
  const video = page.video();
  await context.close();
  const source = connected ? "connected-full.webm" : "level-1-full.webm";
  await rename(await video.path(), join(output, source));
  return { frames, origin, start, source };
}

function summarize(frames) {
  const quantile = (key, p) => {
    const values = frames.map(frame => frame[key]).sort((a, b) => a - b);
    return Math.round(values[Math.floor((values.length - 1) * p)] * 100) / 100;
  };
  const max = key => Math.max(...frames.map(frame => frame[key]));
  return {
    frames: frames.length, frameP50: quantile("duration", 0.5), frameP95: quantile("duration", 0.95),
    drawP50: quantile("drawMs", 0.5), drawP95: quantile("drawMs", 0.95),
    figures: max("figures"), stamps: max("stamps"), represented: max("represented"),
    flights: max("flights"), cohorts: max("cohorts"),
  };
}

try {
  const benchmark = await capture(false);
  reel(benchmark.source, "a-level-1.webm", [benchmark.start + 1.4, 13]);
  const { frames, origin, start, source } = await capture(true);
  const lock = frames.find(frame => frame.phalanx === "secured");
  const march = frames.find(frame => frame.phalanx === "marching");
  const siege = frames.find(frame => frame.siege);
  const flank = frames.find(frame => frame.phase === "flanking");
  const rear = frames.find(frame => frame.phase === "encirclement");
  const win = frames.find(frame => frame.phase === "victory");
  const at = frame => origin + frame.wall / 1000;
  reel(source, "b-two-fronts.webm", [start + 1.4, 13]);
  reel(source, "c-phalanx.webm", [at(march) - 0.8, 12]);
  reel(source, "d-offensive.webm", [at(lock) + 1.35, 4.5], [at(siege) - 0.55, 9],
    [at(flank) - 11.5, 9]);
  reel(source, "e-encirclement.webm", [at(flank) - 1.1, at(win) - at(flank) + 5]);
  const metrics = {
    viewport, phases: { lock: lock.time, siege: siege.time, flank: flank.time, rear: rear.time, win: win.time },
    initial: summarize(frames.filter(frame => frame.time >= 3 && frame.time < 14)),
    shieldWall: summarize(frames.filter(frame => frame.time >= lock.time + 1 && frame.time < lock.time + 9)),
    siege: summarize(frames.filter(frame => frame.time >= siege.time + 2 && frame.time < siege.time + 13)),
    encirclement: summarize(frames.filter(frame => frame.phase === "flanking" || frame.phase === "encirclement")),
  };
  const evidence = JSON.stringify(metrics, null, 2) + "\n";
  await writeFile(join(output, "metrics.json"), evidence);
  console.log(evidence);
} finally {
  await browser.close();
}
