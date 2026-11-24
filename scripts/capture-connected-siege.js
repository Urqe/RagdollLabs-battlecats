import { execFileSync } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, webkit } from "playwright";
import { dualAim } from "../tests/helpers/dual-strategies.js";

const output = process.argv[2] ?? "test-results/connected-siege";
const strategy = process.env.SIEGE_CAPTURE_POLICY ?? "adaptive-seven";
const engine = process.env.SIEGE_BROWSER === "webkit" ? webkit : chromium;
const profileOnly = process.env.SIEGE_PROFILE_ONLY === "1";
const viewport = { width: 390, height: 844 };
const base = "http://127.0.0.1:4173";
await mkdir(output, { recursive: true });
const browser = await engine.launch(engine === chromium
  ? { executablePath: process.env.CHROMIUM_PATH || undefined }
  : {});
function reel(source, title, ...segments) {
  const inputs = segments.flatMap(([start, duration]) => [
    "-ss", String(Math.max(0, start)), ...(duration ? ["-t", String(duration)] : []),
    "-i", join(output, source),
  ]);
  const filter = segments.length === 1 ? ["-vf", "fps=30"] : [
    "-filter_complex", segments.map((_, index) => `[${index}:v]`).join("") +
      `concat=n=${segments.length}:v=1:a=0,fps=30`,
  ];
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...inputs, ...filter, "-an",
    "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-deadline", "realtime",
    "-cpu-used", "5", join(output, title)]);
}

async function capture(levelFour) {
  const context = await browser.newContext({
    viewport, isMobile: true, hasTouch: true,
    recordVideo: profileOnly ? undefined : { dir: output, size: viewport },
  });
  const page = await context.newPage();
  const recordingStart = performance.now();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base);
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
  await page.getByRole("button", { name: levelFour ? /Level 4.*A Tale of Two Tails/ : /Level 1.*The Last Stand/ }).click();
  const start = (performance.now() - recordingStart) / 1000;
  const check = () => page.evaluate(() => window.readBattle());

  if (levelFour) {
    const client = engine === chromium ? await context.newCDPSession(page) : null;
    const box = await page.locator("#game").boundingBox();
    const point = x => ({ x: box.x + x * box.width / 420, y: box.y + box.height * 0.88 });
    let state = await check();
    for (let second = 0; second < 160 && state.mode === "playing"; second++) {
      const x = dualAim(strategy, second, state.dual.lanes, state.gates, state.dual.phalanx);
      if (Math.abs(x - state.gunX) > 2) {
        if (client) {
          await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(state.gunX)] });
          await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(x)] });
          await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        } else {
          const target = point(x);
          await page.mouse.move(target.x, target.y);
        }
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
  const source = levelFour ? "level-4-full.webm" : "level-1-full.webm";
  if (video) await rename(await video.path(), join(output, source));
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
  if (!profileOnly) {
    const benchmark = await capture(false);
    reel(benchmark.source, "level-1-benchmark.webm", [benchmark.start + 1.4, 13]);
  }
  const { frames, origin, start, source } = await capture(true);
  const lock = frames.find(frame => frame.phalanx === "secured");
  const march = frames.find(frame => frame.phalanx === "marching");
  const west99 = frames.find(frame => frame.west99);
  const east99 = frames.find(frame => frame.east99);
  const deploying = frames.find(frame => frame.phalanx === "deploying");
  const siege = frames.find(frame => frame.siege);
  const flank = frames.find(frame => frame.phase === "flanking");
  const rear = frames.find(frame => frame.phase === "encirclement");
  const win = frames.find(frame => frame.phase === "victory");
  const at = frame => origin + frame.wall / 1000;
  if (!profileOnly) {
    reel(source, "a-early-battle.webm", [start + 0.9, 9]);
    reel(source, "b-double-upgrade.webm", [at(west99) - 3, 8], [at(east99) - 2, 7],
      [at(march) - 8, 8]);
    reel(source, "c-phalanx.webm", [at(march) - 0.8, 12]);
    reel(source, "d-offensive.webm", [at(siege) - 0.55, 10], [at(flank) - 11.5, 9]);
    reel(source, "e-encirclement.webm", [at(flank) - 1.1]);
  }
  const metrics = {
    viewport, strategy, browser: engine.name(), recording: !profileOnly,
    phases: { west99: west99.time, east99: east99.time, march: march.time, lock: lock.time,
      siege: siege.time, flank: flank.time, rear: rear.time, win: win.time },
    initial: summarize(frames.filter(frame => frame.time >= 3 && frame.time < 14)),
    deployment: summarize(frames.filter(frame => frame.time >= deploying.time && frame.time < lock.time)),
    transfer: summarize(frames.filter(frame => frame.time >= lock.time && frame.time < lock.time + 4)),
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
