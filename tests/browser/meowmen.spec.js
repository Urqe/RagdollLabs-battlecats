import { expect, test } from "@playwright/test";
import { LEVEL_ONE, LEVEL_TWO, LEVEL_THREE } from "../../src/levels.js";
import { meowmenAim } from "../helpers/meowmen.js";
import { advanceUntil, setup, snapshot } from "./harness.js";

test("Meowmen selection, defeat, replay, victory and progress on mobile", async ({
  page, browserName,
}) => {
  const { aim, errors } = await setup(page, browserName, false);
  const select = (level) => page.locator(`[data-level="${level.id}"]`);
  await page.locator("#chooseLevel").click();
  await expect(select(LEVEL_ONE)).toBeEnabled();
  await expect(select(LEVEL_TWO)).toBeEnabled();
  await select(LEVEL_THREE).click();

  await aim(LEVEL_THREE.support.x);
  const flight = await advanceUntil(page, (s) => s.support.shot !== null, 5, 100);
  await expect(page.locator("#banner")).toHaveText("MEOWMEN BARRAGE STARTED!");
  expect(flight.support.shot).toMatchObject({
    originX: LEVEL_THREE.support.x, originY: LEVEL_THREE.support.y, arrows: 6,
  });
  await advanceUntil(page, (s) => s.support.impacts >= 3, 4, 100);
  await advanceUntil(page, (s) => s.danger.flashUntil > s.t, 12, 100);
  await expect(page.locator("#danger")).toContainText("AIM AT ×20");
  const defeated = await advanceUntil(page, (s) => s.mode === "end", 10, 200);
  expect(defeated.support.damage).toBeGreaterThan(0);
  expect(defeated.support.shot).toBeNull();
  await expect(page.locator("#resultLevel")).toHaveText("Level 3 · The Meowmen");
  await expect(page.locator("#resultTitle")).toHaveText("The horde broke through");
  await page.locator("#replay").click();
  expect((await snapshot(page)).support).toMatchObject({ open: false, damage: 0, shot: null });

  const plan = meowmenAim("balanced");
  let state = await snapshot(page);
  while (state.mode === "playing" && state.t < 125) {
    const target = plan(state);
    if (Math.abs(target - state.gunX) > 1) await aim(target);
    await page.clock.runFor(120);
    state = await snapshot(page);
  }
  expect(state.mode).toBe("victory");
  expect(state.finalActivated).toBe(true);
  expect(state.support.impacts).toBeGreaterThan(200);
  await advanceUntil(page, (s) => s.mode === "end", 3);
  await expect(page.locator("#resultTitle")).toHaveText("The castle stands!");
  await page.locator("#resultLevels").click();
  await expect(select(LEVEL_THREE)).toContainText("Completed");
  await select(LEVEL_TWO).click();
  let switched = await snapshot(page);
  expect(switched.level.id).toBe(LEVEL_TWO.id);
  expect(switched.support).toMatchObject({ open: false, damage: 0, shot: null });
  await page.locator("#battleLevels").click();
  await select(LEVEL_ONE).click();
  switched = await snapshot(page);
  expect(switched.level.id).toBe(LEVEL_ONE.id);
  expect(switched.support).toBeNull();
  await page.locator("#battleLevels").click();
  await select(LEVEL_THREE).click();
  await page.reload();
  await expect(page.locator("#menuLevel")).toHaveText("Level 3 · The Meowmen");
  await expect(page.locator("#artilleryTip")).toContainText("automatic arrow volleys");
  await page.locator("#chooseLevel").click();
  await expect(select(LEVEL_THREE)).toContainText("Completed");
  expect(errors).toEqual([]);
});
