import { expect, test } from "@playwright/test";
import { LEVEL_FIVE } from "../../src/levels.js";
import { pawtorianAim } from "../helpers/pawtorians.js";
import { advanceUntil, setup, snapshot } from "./harness.js";

test("Level 5 marches in armor, counters it with artillery and compounds a winning army", async ({ page, browserName }, testInfo) => {
  const { aim, errors } = await setup(page, browserName, false);
  const select = page.locator('[data-level="pawtorians"]');
  await page.getByRole("button", { name: "Choose level" }).click();
  await expect(select).toBeEnabled();
  await select.click();
  let s = await snapshot(page);
  expect(s.level.id).toBe(LEVEL_FIVE.id);
  expect(s.pawtorians.spawnedAt).toBeNull();
  let goal = s.gunX;
  let approach = null;
  let frontOnArrival = null;
  let crisis = false;
  let compound = false;
  const capture = (name) => page.screenshot({ path: testInfo.outputPath(name), scale: "css" });
  for (let tick = 0; tick < 1000 && s.mode === "playing"; tick++) {
    const next = pawtorianAim("gates-support", s);
    if (next !== goal) {
      await aim(next);
      goal = next;
    }
    await page.clock.runFor(100);
    s = await snapshot(page);
    if (!approach && s.pawtorians.spawnedAt !== null && s.pawtorians.y > 160) {
      expect(s.pawtorians.arrivedAt).toBeNull();
      approach = s.pawtorians.y;
      await capture("01-imperial-vanguard.png");
    }
    if (s.pawtorians.arrivedAt !== null && frontOnArrival === null) {
      expect(s.pawtorians.y).toBeGreaterThan(approach + 70);
      frontOnArrival = s.front;
    }
    if (!crisis && frontOnArrival !== null && s.front > frontOnArrival + 85) {
      crisis = true;
      await capture("02-armored-offensive.png");
    }
    if (!compound && s.squads.some(cohort => cohort.count === 500)) {
      compound = true;
      await capture("03-compounding-reinforcements.png");
    }
  }
  expect(crisis && compound).toBe(true);
  expect(s.mode).toBe("victory");
  expect(s.redEntryOpen).toBe(false);
  expect(s.redTotal).toBe(0);
  expect(s.pawtorians.count).toBe(0);
  expect(s.pawtorians.artillery.armored).toBeGreaterThan(600);
  expect(s.blueTotal).toBeGreaterThan(25000);
  await advanceUntil(page, state => state.mode === "end", 3, 200);
  await expect(page.locator("#resultTitle")).toHaveText("The castle stands!");
  await capture("04-victory.png");
  await page.locator("#resultLevels").click();
  await expect(select).toContainText("Completed");
  await select.click();
  s = await snapshot(page);
  expect(s.pawtorians).toMatchObject({ count: 0, spawnedAt: null, arrivedAt: null });
  expect(s.work).toEqual([0, 0, 0]);
  expect(s.support.open).toBe(false);
  expect(errors).toEqual([]);
});
