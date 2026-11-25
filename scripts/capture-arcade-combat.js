import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createAim } from "../tests/helpers/strategies.js";
import { dualAim } from "../tests/helpers/dual-strategies.js";
import { purrapultAim } from "../tests/helpers/purrapult.js";
import { meowmenAim } from "../tests/helpers/meowmen.js";
import { LEVEL_TWO, LEVEL_THREE } from "../src/levels.js";

const output = resolve(process.argv[2] ?? "test-results/arcade-combat");
const viewport = { width: 390, height: 844 };
const url = process.env.SIEGE_URL ?? "http://127.0.0.1:4173";
const scenarios = [
  { name: "a-level-1", id: "last-stand", aim: createAim("C"), result: "victory" },
  { name: "b-west-recovery", id: "two-tails", aim: s => s.t < 4 ? 214 : 96, result: "defeat" },
  { name: "d-level-4-win", id: "two-tails",
    aim: s => dualAim("adaptive-imperfect", Math.floor(s.t + 1e-8), s.dual.lanes, s.gates, s.dual.phalanx),
    result: "victory" },
  { name: "e-level-4-loss", id: "two-tails", aim: () => 214, result: "defeat" },
  { name: "f-level-2", id: "purrapult", aim: purrapultAim("artillery-first", LEVEL_TWO), supportHits: 3 },
  { name: "f-level-3", id: "meowmen", aim: meowmenAim("archer-first", LEVEL_THREE), supportHits: 30 },
];

async function capture(browser, plan) {
  const context = await browser.newContext({ viewport, isMobile: true,
    hasTouch: true, deviceScaleFactor: 2,
    recordVideo: { dir: output, size: viewport },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const marks = [];
  const origin = performance.now();
  const elapsed = () => (performance.now() - origin) / 1000;
  try {
    await page.goto(url);
    await page.locator("#chooseLevel").click();
    await page.locator(`[data-level="${plan.id}"]`).click();
    const box = await page.locator("#game").boundingBox();
    await page.screenshot({ path: resolve(output, plan.name + "-opening.png"), scale: "css" });
    const client = await context.newCDPSession(page);
    let result;
    let showedSupport = false;
    let lastSample = -1;
    while (elapsed() < 240) {
      const s = await page.evaluate(async () => (await import("/src/main.js")).getSnapshot());
      if (s.mode === "victory" || s.mode === "defeat") result ??= s.mode;
      const second = Math.floor(s.t + 1e-8);
      if (second > lastSample || s.mode === "end") {
        lastSample = second;
        const left = s.dual?.lanes.left;
        marks.push({ videoTime: elapsed(), t: s.t, mode: s.mode, gunX: s.gunX,
          blue: left?.blueTotal ?? s.blueTotal, red: left?.redTotal ?? s.redTotal,
          leftFront: left?.front, leftVelocity: left?.frontVelocity,
          eastFront: s.dual?.lanes.right.front, phase: s.dual?.phalanx.phase,
          siege: s.dual?.siege.phase, supportDamage: s.support?.damage });
      }
      if (s.mode === "end") break;
      showedSupport = plan.supportHits > 0 && s.support?.impacts >= plan.supportHits && s.support.damage > 0;
      if (showedSupport) break;
      if (s.mode === "playing") {
        const x = plan.aim(s);
        if (Math.abs(s.gunX - x) > 1) {
          const start = { x: box.x + box.width * s.gunX / 420, y: box.y + box.height * 0.88 };
          const end = box.x + box.width * x / 420;
          await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
          await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...start, x: end }] });
          await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        }
      }
      await new Promise(done => setTimeout(done, 22));
    }
    // A single-corridor defeat transitions directly to the result.
    if (plan.supportHits && !showedSupport) throw new Error(`${plan.name}: support sequence incomplete`);
    if (plan.result && result !== plan.result && !await page.getByRole("heading", {
      name: plan.result === "victory" ? "The castle stands!" : "The horde broke through",
    }).isVisible()) throw new Error(`${plan.name}: expected ${plan.result}, saw ${result}`);
    if (errors.length) throw new Error(errors.join("\n"));
    await page.waitForTimeout(900);
  } finally {
    await context.close();
    const video = page.video();
    await video.saveAs(resolve(output, plan.name + ".webm"));
    await video.delete();
    await writeFile(resolve(output, `${plan.name}-timing.json`), JSON.stringify(marks));
  }
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const requested = process.argv.slice(3);
  for (const plan of scenarios) {
    if (requested.length && !requested.some(prefix => plan.name.startsWith(prefix))) continue;
    await capture(browser, plan);
  }
} finally {
  await browser.close();
}
