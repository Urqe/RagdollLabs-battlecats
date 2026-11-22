import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createAim, createRescueAim } from "../tests/helpers/strategies.js";
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
  const paired = policy === "rescue" || policy === "ignore";
  if (paired) {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
  }
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
  const rescue = paired ? createRescueAim(policy === "rescue") : null;
  const aim = rescue?.aim ?? (level === 2 ? purrapultAim("artillery-first") : createAim(policy));
  let target = (await snapshot()).gunX;
  while (elapsed() < 360) {
    const state = await snapshot();
    if (state.t >= 2) marks.contact ??= elapsed();
    if (state.t >= 14) marks.earlyEnd ??= elapsed();
    if (rescue?.timing.warning !== undefined) marks.warning ??= elapsed();
    if (rescue?.timing.switchAt !== undefined) {
      marks.redirect ??= elapsed();
      if (state.danger.velocity < 0) marks.reversal ??= elapsed();
    }
    if (state.gates[1].open) marks.gate99 ??= elapsed();
    if (state.gates[2].open) marks.gate999 ??= elapsed();
    if (state.finalActivated) marks.flood ??= elapsed();
    if (state.support?.open) marks.catapult ??= elapsed();
    if (state.support?.impact?.loss > 0) marks.firstHit ??= elapsed();
    if (!state.redEntryOpen) marks.cutoff ??= elapsed();
    if (state.mode === "victory") marks.victory ??= elapsed();
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
        const initialRedirect = paired && state.t === 0;
        target = next;
        if (initialRedirect) await page.clock.resume();
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

async function formationFixture(page, elapsed) {
  await page.evaluate(async () => {
    const [{ createState }, { createMotion }, { createRenderer }] = await Promise.all([
      import("/src/state.js"), import("/src/motion.js"), import("/src/render.js"),
    ]);
    document.querySelector("#menu").hidden = true;
    const label = document.createElement("div");
    label.style.cssText = "position:absolute;top:18px;left:0;width:100%;text-align:center;z-index:10;font:bold 14px system-ui";
    document.body.append(label);
    const state = createState();
    Object.assign(state, { mode: "playing", front: 290, blueTotal: 320, redTotal: 650 });
    const motion = createMotion();
    const renderer = createRenderer(state, document.querySelector("#game"), motion);
    const wave = { x: 210, entryY: 565, count: 99, mult: 99, phase: 1, slot: 0, marchTime: 0 };
    const dt = 1 / 60;
    let tick = 0;
    motion.step(0, 0, state.blueTotal, true, state.level, state);
    function frame() {
      state.t = ++tick * dt;
      const retreat = state.t >= 4 && state.t < 5.8;
      const advance = state.t >= 6.8 && state.t < 9.8;
      const speed = retreat ? 16 : advance ? -12 : 0;
      state.front += speed * dt;
      if (tick === 24) state.squads.push(wave);
      if (state.squads.length) wave.marchTime += dt;
      if (tick === 154) {
        state.squads.length = 0;
        state.blueTotal += wave.count;
        motion.receive("arrival", state.t, wave, state.front);
      }
      label.textContent = "RENDERING FIXTURE · " +
        (retreat ? "RETREAT" : advance ? "COUNTERATTACK" : state.t < 4 ? "HOLD AND RECEIVE" : "REGROUP");
      motion.step(state.t, speed, state.blueTotal, true, state.level, state);
      renderer.draw();
      if (tick < 630) requestAnimationFrame(frame);
      else window.finishedFormationFixture = true;
    }
    renderer.resize();
    requestAnimationFrame(frame);
  });
  const start = elapsed();
  await page.waitForFunction(() => window.finishedFormationFixture, null, { timeout: 120000 });
  return { start, end: elapsed(), fixtureSeconds: { arrival: 154 / 60, retreat: 4, regroup: 5.8, counterattack: 6.8 } };
}

function encode({ name, file, marks }) {
  const range = {
    "m13-a-local-combat": [marks.contact, marks.earlyEnd],
    "m13-b-pushback": [marks.redirect - 0.3, marks.reversal + 4],
    "m13-c-rescue": [marks.warning - 2, marks.reversal + 5],
    "m13-d-ignored": [marks.warning - 2, marks.end],
    "m13-e-level-1": [marks.victory - 2.5, marks.end],
    "m13-f-level-2": [marks.victory - 2.5, marks.end],
  }[name] ?? [marks.start, marks.end];
  const start = Math.max(0, range[0] - 0.23);
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-i", file,
    "-t", String(range[1] - start), "-an", "-r", "25", "-c:v", "libx264",
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
  ["e-formation-fixture", formationFixture],
  ["m13-a-local-combat", (page, time, ctx) => battle(page, time, ctx, "C", 1, true)],
  ["m13-c-rescue", (page, time, ctx) => battle(page, time, ctx, "rescue", 1, true)],
  ["m13-d-ignored", (page, time, ctx) => battle(page, time, ctx, "ignore", 1, false)],
  ["m13-f-level-2", (page, time, ctx) => battle(page, time, ctx, null, 2, true)],
];
try {
  const selected = requested.length
    ? scenarios.filter(([name]) => requested.some((prefix) => name.startsWith(prefix)))
    : scenarios.filter(([name]) => !name.startsWith("m13-"));
  const captures = [];
  for (const [name, action] of selected) {
    const capture = await record(name, action);
    encode(capture);
    const companion = { "m13-a-local-combat": "m13-e-level-1", "m13-c-rescue": "m13-b-pushback" }[name];
    if (companion) encode({ ...capture, name: companion });
    captures.push(capture);
  }
  const marks = Object.fromEntries(captures.map(({ name, marks }) => [name, marks]));
  await writeFile(resolve(output, "timing.json"), JSON.stringify(marks, null, 2) + "\n");
} finally {
  await browser.close();
}
