import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { retreatProjection } from "../../src/retreat-presentation.js";
import { LEVEL_ONE, LEVEL_FIVE } from "../../src/levels.js";
import { pawtorianAim } from "../helpers/pawtorians.js";
import { setup, snapshot } from "./harness.js";

const scenes = [
  { id: "defeat", level: LEVEL_ONE, aim: s => s.gates[0].x, captureAt: 590 },
  { id: "recovery", level: LEVEL_FIVE, aim: s => s.gates[1].open && s.t < 30.5
    ? s.gates[1].x : pawtorianAim("gates", s), captureAt: 650 },
  { id: "armored-retreat", level: LEVEL_FIVE, aim: s => pawtorianAim("strong-support", s), captureAt: 585 },
];

for (const { id, level, aim: policy, captureAt } of scenes) {
  test(`${id} retains the authoritative outcome at the multiplier line`, async ({ page, browserName }) => {
    const { errors, aim } = await setup(page, browserName, false, process.env.DEFEAT_BASE_URL ?? "/");
    const capture = process.env.DEFEAT_RECORD_DIR && join(process.env.DEFEAT_RECORD_DIR, id);
    if (capture) await mkdir(capture, { recursive: true });
    await page.getByRole("button", { name: "Choose level" }).click();
    await page.locator(`[data-level="${level.id}"]`).click();
    let s = await snapshot(page);
    let furthest = s.front;
    let goal = s.gunX;
    let frames = 0;
    let sawArrivalBehindGate = false;
    for (let tick = 0; tick < 1100 && s.mode === "playing"; tick++) {
      const next = policy(s);
      if (next !== goal) {
        await aim(next);
        goal = next;
      }
      const previous = s;
      await page.clock.runFor(capture ? 100 : 200);
      s = await snapshot(page);
      furthest = Math.max(furthest, s.front);
      if (s.front > level.gates[0].hitY && previous.blueTotal < s.blueTotal)
        sawArrivalBehindGate = true;
      if (capture && (s.front >= captureAt || (frames && s.front >= captureAt - 5))) {
        await page.screenshot({ path: join(capture, `${String(++frames).padStart(4, "0")}.png`), scale: "css" });
      }
      if (id === "recovery" && (s.t > 80 && furthest - s.front > 18)) break;
    }
    expect(sawArrivalBehindGate).toBe(true);
    if (id === "recovery") {
      expect(furthest).toBeGreaterThan(640);
      expect(furthest).toBeLessThan(level.objective.castleFront);
      expect(s.mode).toBe("playing");
      expect(s.frontVelocity).toBeLessThan(0);
    } else {
      expect(s.mode).toBe("end");
      expect(s.front).toBeGreaterThanOrEqual(level.objective.castleFront);
      await expect(page.locator("#resultTitle")).toHaveText("The horde broke through");
      if (!process.env.DEFEAT_BASE_URL) {
        const { boundary } = retreatProjection(level);
        const pixels = await page.locator("#game").evaluate((canvas, line) => {
          const { width, height } = canvas;
          const floor = Math.ceil(line * height / 760);
          const near = Math.floor((line - 18) * height / 760);
          const ctx = canvas.getContext("2d");
          function red(y, rows) {
            const data = ctx.getImageData(0, y, width, rows).data;
            let count = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              count += Number((r === 223 && g === 84 && b === 75) ||
                (r === 185 && g === 56 && b === 67));
            }
            return count;
          }
          return { near: red(near, floor - near), past: red(floor + 2, height - floor - 2) };
        }, boundary);
        expect(pixels.near).toBeGreaterThan(5);
        expect(pixels.past).toBe(0);
      }
    }
    if (id === "armored-retreat") {
      expect(s.pawtorians.count).toBeGreaterThan(0);
      expect(s.pawtorians.artillery.armored).toBeGreaterThan(500);
    }
    expect(errors).toEqual([]);
  });
}
