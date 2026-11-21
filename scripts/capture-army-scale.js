import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { purrapultAim } from "../tests/helpers/purrapult.js";

const output = resolve(process.argv[2] ?? "test-results/army-scale");
const url = "http://127.0.0.1:4173";
const viewport = { width: 390, height: 844 };
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

async function record(action) {
  const context = await browser.newContext({
    viewport, isMobile: true, hasTouch: true,
    recordVideo: { dir: output, size: viewport },
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
  return { base: await page.video().path(), marks };
}

function clip(recording, name, first, last) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", String(first), "-i", recording.base, "-t", String(last - first),
    "-an", "-r", "25", "-c:v", "libx264", "-preset", "fast", "-crf", "24",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", resolve(output, name),
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`FFmpeg failed for ${name}`, { cause: result.error });
}

const capture = (page, name) => page.screenshot({
  path: resolve(output, name), scale: "css",
});

async function fixture(page) {
  await page.evaluate(async () => {
    const [{ createGame }, { createMotion }, { createRenderer }] = await Promise.all([
      import("/src/game.js"), import("/src/motion.js"), import("/src/render.js"),
    ]);
    document.querySelector("#menu").hidden = true;
    const motion = createMotion();
    const game = createGame({ random: () => 0.5, onEffect: motion.receive });
    const { state } = game;
    const renderer = createRenderer(state, document.querySelector("#game"), motion);
    renderer.resize();
    let timer;
    window.armyFixture = (blue, red, simulate) => {
      cancelAnimationFrame(timer);
      game.reset();
      motion.reset();
      Object.assign(state, {
        blueTotal: blue, redTotal: red, redEntryOpen: !simulate,
        redEntryRate: simulate ? 0 : 2200,
        front: 335, nextShot: Infinity,
      });
      let last = performance.now();
      function frame(now) {
        const dt = Math.min(0.045, (now - last) / 1000);
        last = now;
        const front = state.front;
        if (simulate) game.update(dt);
        else state.t += dt;
        motion.step(state.t, (state.front - front) / (dt || 1), state.blueTotal,
          state.redEntryOpen, state.level, state);
        renderer.draw();
        timer = requestAnimationFrame(frame);
      }
      renderer.draw();
      timer = requestAnimationFrame(frame);
    };
  });
}

async function setArmy(page, blue, red, simulate = false) {
  await page.evaluate(([b, r, live]) => window.armyFixture(b, r, live), [blue, red, simulate]);
}

async function smallEncounter(page, elapsed) {
  await fixture(page);
  await setArmy(page, 5, 5, true);
  const start = elapsed();
  await pause(350);
  await capture(page, "a-five-vs-five.png");
  await pause(4700);
  await setArmy(page, 20, 20, true);
  await pause(200);
  await capture(page, "a-twenty-vs-twenty.png");
  await pause(4300);
  return { start, end: elapsed() - 0.2 };
}

async function scaleComparison(page, elapsed) {
  await fixture(page);
  await setArmy(page, 1800, 2000);
  const start = elapsed();
  await pause(250);
  await capture(page, "c-red-002000.png");
  await pause(2550);
  await setArmy(page, 1800, 200000);
  await pause(250);
  await capture(page, "c-red-200000.png");
  await pause(4450);
  const end = elapsed() - 0.2;
  for (const [count, name] of [[10000, "010000"], [50000, "050000"], [500000, "500000"]]) {
    await setArmy(page, 1800, count);
    await pause(250);
    await capture(page, `c-red-${name}.png`);
  }
  return { start, end };
}

async function liveBattle(page, elapsed, context) {
  await page.locator("#chooseLevel").click();
  await page.locator('[data-level="purrapult"]').click();
  const snapshot = () =>
    page.evaluate(async () => (await import("/src/main.js")).getSnapshot());
  const box = await page.locator("#game").boundingBox();
  const client = await context.newCDPSession(page);
  const aim = purrapultAim("artillery-first");
  let target = (await snapshot()).gunX;
  const marks = {};
  let previousImpact = 0;
  let shotStart;
  while (elapsed() < 85) {
    const state = await snapshot();
    if (state.mode !== "playing") break;
    const next = aim(state);
    if (next !== target) {
      const x = box.x + (state.gunX / 420) * box.width;
      const y = box.y + box.height * 0.88;
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart", touchPoints: [{ x, y }],
      });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x: x + ((next - state.gunX) / 420) * box.width, y }],
      });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      target = next;
    }
    if (state.support.shot && shotStart?.tick !== state.support.shot.launchedAt) {
      shotStart = { tick: state.support.shot.launchedAt, wall: elapsed(), population: state.redTotal };
    }
    if (shotStart?.population >= 10000 && state.support.impacts > previousImpact &&
        state.support.impact.loss > 0 && !marks.strike) {
      marks.launch = shotStart.wall;
      marks.strike = elapsed();
      marks.strikePopulation = state.redTotal;
      marks.strikeLoss = state.support.impact.loss;
    }
    previousImpact = state.support.impacts;
    if (state.squads.some((q) => q.mult === 99)) marks.wave ??= elapsed();
    if (marks.strike && marks.wave && elapsed() > marks.wave + 8.5) break;
    await pause(24);
  }
  if (!marks.strike || !marks.wave) throw new Error(JSON.stringify(marks));
  return marks;
}

try {
  const encounter = await record(smallEncounter);
  clip(encounter, "a-small-encounters.mp4", encounter.marks.start, encounter.marks.end);
  const scale = await record(scaleComparison);
  clip(scale, "c-enormous-army.mp4", scale.marks.start, scale.marks.end);
  const live = await record(liveBattle);
  clip(live, "b-medium-combat.mp4", live.marks.wave - 1.5, live.marks.wave + 7.8);
  clip(live, "d-purrapult-recovery.mp4", live.marks.launch - 1.4, live.marks.strike + 1.9);
  await writeFile(resolve(output, "timing.json"), JSON.stringify(live.marks, null, 2) + "\n");
} finally {
  await browser.close();
}
