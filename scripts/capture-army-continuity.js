import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createAim } from "../tests/helpers/strategies.js";
import { purrapultAim } from "../tests/helpers/purrapult.js";

const output = resolve(process.argv[2] ?? "test-results/army-continuity");
const url = process.argv[3] ?? "http://127.0.0.1:4173";
const requested = process.argv.slice(4);
const viewport = { width: 390, height: 844 };
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

async function record(name, action) {
  const context = await browser.newContext({
    viewport, isMobile: true, hasTouch: true, recordVideo: { dir: output, size: viewport },
  });
  const origin = performance.now();
  const elapsed = () => (performance.now() - origin) / 1000;
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  let marks;
  try {
    await page.goto(url);
    await page.addStyleTag({ content: "#hud,#banner {visibility:hidden !important}" });
    marks = await action(page, elapsed, context);
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await context.close();
  }
  return { name, file: await page.video().path(), marks };
}

async function battle(page, elapsed, context, policy, level, win) {
  if (level === 2) {
    await page.locator("#chooseLevel").click();
    await page.locator('[data-level="purrapult"]').click();
  } else {
    await page.locator("#play").click();
  }
  const marks = { start: elapsed() };
  const snapshot = () =>
    page.evaluate(async () => (await import("/src/main.js")).getSnapshot());
  const client = await context.newCDPSession(page);
  const box = await page.locator("#game").boundingBox();
  const aim = level === 2 ? purrapultAim("artillery-first") : createAim(policy);
  let target = (await snapshot()).gunX;
  while (elapsed() < 230) {
    const state = await snapshot();
    if (state.gates[1].open) marks.gate99 ??= elapsed();
    if (state.gates[2].open) marks.gate999 ??= elapsed();
    if (state.finalActivated) marks.flood ??= elapsed();
    if (state.support?.open) marks.catapult ??= elapsed();
    if (state.support?.impact?.loss > 0) marks.firstHit ??= elapsed();
    if (!state.redEntryOpen) marks.cutoff ??= elapsed();
    if (state.mode === "end") {
      marks.result = elapsed();
      marks.battleSeconds = state.t;
      marks.impacts = state.support?.impacts ?? 0;
      break;
    }
    if (state.mode === "playing") {
      const next = aim(state);
      if (next !== target) {
        const x = box.x + (state.gunX / 420) * box.width;
        const y = box.y + box.height * 0.88;
        await client.send("Input.dispatchTouchEvent", {
          type: "touchStart", touchPoints: [{ x, y }],
        });
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: x + (next - state.gunX) * box.width / 420, y }],
        });
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        target = next;
      }
    }
    await pause(25);
  }
  if (!marks.result) throw new Error(`Incomplete battle: ${JSON.stringify(marks)}`);
  await page.getByRole("heading", {
    name: win ? "The castle stands!" : "The horde broke through",
  }).waitFor();
  await pause(1500);
  marks.end = elapsed();
  return marks;
}

async function fixture(page, elapsed) {
  await page.evaluate(async () => {
    const [{ createGame }, { createMotion }, { createRenderer }] = await Promise.all([
      import("/src/game.js"), import("/src/motion.js"), import("/src/render.js"),
    ]);
    document.querySelector("#menu").hidden = true;
    const chart = document.createElement("div");
    chart.style.cssText = "position:absolute;top:19px;left:0;width:100%;text-align:center;z-index:10;font:bold 15px system-ui";
    document.body.append(chart);
    const motion = createMotion();
    const game = createGame();
    game.reset();
    const { state } = game;
    const renderer = createRenderer(state, document.querySelector("#game"), motion);
    state.blueTotal = 200000;
    state.redTotal = 3000;
    state.front = 335;
    state.redEntryOpen = false;
    const origin = performance.now();
    const populations = [200000, 150000, 100000, 50000, 10000, 1000];
    let previous;
    window.continuityMarks = [];
    function frame(now) {
      state.t = Math.max(0, (now - origin) / 1000);
      const index = Math.max(0, Math.min(5, Math.floor((state.t - 1.8) / 1.4)));
      state.blueTotal = populations[index];
      if (state.blueTotal !== previous) {
        chart.textContent = `BLUE TROOPS · ${state.blueTotal.toLocaleString("en-US")}`;
        window.continuityMarks.push({ t: state.t, blue: state.blueTotal });
        previous = state.blueTotal;
      }
      motion.step(state.t, 0, state.blueTotal, false, state.level, state);
      renderer.draw();
      if (state.t < 10.8) requestAnimationFrame(frame);
    }
    renderer.resize();
    requestAnimationFrame(frame);
  });
  const start = elapsed() + 1.2;
  await pause(10650);
  return { start, end: elapsed(), populations: await page.evaluate(() => window.continuityMarks) };
}

function encode({ name, file, marks }) {
  const start = Math.max(0, marks.start - 0.23);
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-i", file,
    "-t", String(marks.end - start), "-an", "-r", "25", "-c:v", "libx264",
    "-preset", "fast", "-crf", "25", "-threads", "2",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", resolve(output, `${name}.mp4`),
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`FFmpeg failed for ${name}`, { cause: result.error });
}

const scenarios = [
  ["a-level-1-victory", (page, time, ctx) => battle(page, time, ctx, "C", 1, true)],
  ["b-level-1-defeat", (page, time, ctx) => battle(page, time, ctx, "A", 1, false)],
  ["c-level-2-victory", (page, time, ctx) => battle(page, time, ctx, null, 2, true)],
  ["d-population-decline", fixture],
];
try {
  const selected = requested.length
    ? scenarios.filter(([name]) => requested.some((prefix) => name.startsWith(prefix)))
    : scenarios;
  const captures = await Promise.all(selected.map(([name, action]) => record(name, action)));
  for (const capture of captures) encode(capture);
  const marks = Object.fromEntries(captures.map(({ name, marks }) => [name, marks]));
  await writeFile(resolve(output, "timing.json"), JSON.stringify(marks, null, 2) + "\n");
} finally {
  await browser.close();
}
