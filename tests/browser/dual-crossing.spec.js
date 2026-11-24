import { test, expect } from "@playwright/test";
import { FLAG_CAPTURE_TIME, FLAG_RAISE_TIME } from "../../src/army-movement.js";
import { dualAim } from "../helpers/dual-strategies.js";
import { advanceUntil, setup, snapshot } from "./harness.js";

async function selectTwoTails(page) {
  await page.getByRole("button", { name: "Choose level" }).click();
  await page.getByRole("button", { name: /Level 4.*A Tale of Two Tails/ }).click();
}

const pause = page => page.getByRole("button", { name: "Pause", exact: true });
const resume = page => page.getByRole("button", { name: "Resume", exact: true });
const canvasImage = page => page.locator("#game").evaluate(canvas => canvas.toDataURL());

async function flagColor(page, rgb) {
  return page.locator("#game").evaluate((canvas, color) => {
    const { data } = canvas.getContext("2d").getImageData(355, 91, 36, 52);
    let area = 0;
    for (let i = 0; i < data.length; i += 4)
      if (color.every((channel, offset) => data[i + offset] === channel)) area++;
    return area;
  }, rgb);
}

test("the public selector, visibility pause during deployment, restart and level switch", async ({ page, browserName }) => {
  const { errors, aim } = await setup(page, browserName, false);
  await selectTwoTails(page);
  const box = await page.locator("#game").boundingBox();
  expect(box.width).toBe(390);
  expect(box.height).toBeGreaterThan(700);
  const initial = await snapshot(page);
  let deploying = initial;
  for (let second = 0; second < 80 && deploying.dual.phalanx.phase !== "deploying"; second++) {
    const target = dualAim("adaptive-seven", second, deploying.dual.lanes, deploying.gates, deploying.dual.phalanx);
    if (Math.abs(target - deploying.gunX) > 2) await aim(target);
    await page.clock.runFor(1000);
    deploying = await snapshot(page);
  }
  expect(deploying.dual.phalanx.phase).toBe("deploying");
  expect(deploying.dual.lanes.left.front).toBeGreaterThan(initial.dual.lanes.left.front);
  expect(deploying.dual.lanes.left.redEntryOpen).toBe(true);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const frozen = await snapshot(page);
  const image = await canvasImage(page);
  await page.clock.fastForward(3600000);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(resume(page)).toBeVisible();
  expect(await snapshot(page)).toEqual(frozen);
  expect(await canvasImage(page)).toBe(image);
  await resume(page).click();
  const secured = await advanceUntil(page, s => s.dual.phalanx.phase === "secured", 2, 100);
  expect(secured.mode).toBe("playing");
  expect(secured.dual.lanes.left.redEntryOpen).toBe(true);
  expect(secured.dual.lanes.left.redTotal).toBeGreaterThan(0);

  await pause(page).click();
  await page.getByRole("button", { name: "Restart" }).click();
  const restarted = await snapshot(page);
  expect(restarted.t).toBe(0);
  expect(restarted.work).toEqual([0, 0, 0, 0]);
  expect(restarted.dual.phalanx.phase).toBe("locked");
  expect(restarted.dual.retreat).toBeNull();
  expect(restarted.shots).toHaveLength(0);
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await page.locator("[data-level='purrapult']").click();
  const other = await snapshot(page);
  expect(other.dual).toBeUndefined();
  expect(other.level.number).toBe(2);
  expect(errors).toEqual([]);
});

test("a public playthrough seals the flank and routs the horde with the ×999 surge", async ({ page, browserName }) => {
  const { aim, errors } = await setup(page, browserName, false);
  await selectTwoTails(page);
  const easternBlueBeforeSurge = [];
  let sawRightSiegeSquad = false;
  let s = await snapshot(page);
  for (let second = 0; second < 160 && s.mode === "playing"; second++) {
    const target = dualAim("adaptive-seven", second, s.dual.lanes, s.gates, s.dual.phalanx);
    if (Math.abs(s.gunX - target) > 2) await aim(target);
    await page.clock.runFor(1000);
    s = await snapshot(page);
    if (!s.gates[5].open) easternBlueBeforeSurge.push(s.dual.lanes.right.blueTotal);
    sawRightSiegeSquad ||= s.dual.lanes.right.squads.some(squad => squad.count === 999);
  }
  expect(s.mode).toBe("victory");
  expect(s.work).toEqual([132, 30, 30, 90]);
  expect(sawRightSiegeSquad).toBe(true);
  expect(s.dual.lanes.right.blueTotal).toBeGreaterThan(Math.max(...easternBlueBeforeSurge) * 4);
  expect(s.dual.phalanx.phase).toBe("secured");
  expect(s.dual.retreat.count).toBeGreaterThan(0);
  for (const lane of Object.values(s.dual.lanes)) {
    expect(lane.redEntryOpen).toBe(false);
    expect(lane.redTotal).toBe(0);
  }
  await expect(page.locator("#result")).toBeHidden();
  await pause(page).click();
  const frozen = await snapshot(page);
  const image = await canvasImage(page);
  expect(await flagColor(page, [221, 104, 86])).toBeGreaterThan(120);
  await page.clock.fastForward(60000);
  expect(await snapshot(page)).toEqual(frozen);
  expect(await canvasImage(page)).toBe(image);
  await resume(page).click();
  const flags = await advanceUntil(page,
    next => next.victoryElapsed >= FLAG_CAPTURE_TIME + FLAG_RAISE_TIME, 3, 100);
  expect(flags.mode).toBe("victory");
  expect(flags.dual).toEqual(frozen.dual);
  expect(await flagColor(page, [65, 178, 255])).toBeGreaterThan(120);
  await expect(page.locator("#result")).toBeHidden();
  await page.clock.runFor(2500);
  await expect(page.getByRole("heading", { name: "The castle stands!" })).toBeVisible();

  await page.reload();
  await expect(page.locator("#menuLevel")).toHaveText("Level 4 · A Tale of Two Tails");
  await page.getByRole("button", { name: "Choose level" }).click();
  await expect(page.locator("[data-level='two-tails']")).toContainText("Completed");
  expect(errors).toEqual([]);
});

test("camping either ×20 shows a pausable reaction naming the breached crossing", async ({ page, browserName }) => {
  const { aim } = await setup(page, browserName, false);
  await selectTwoTails(page);
  const { gates } = await snapshot(page);
  for (const [target, breached, held] of [[gates[2].x, "right", "left"], [gates[3].x, "left", "right"]]) {
    await aim(target);
    const s = await advanceUntil(page, next => next.mode === "defeat", 38, 200);
    expect(s.dual.lanes[breached].breached).toBe(true);
    expect(s.dual.lanes[held].breached).toBe(false);
    await expect(page.locator("#result")).toBeHidden();
    await pause(page).click();
    const frozen = await snapshot(page);
    await page.clock.fastForward(60000);
    expect(await snapshot(page)).toEqual(frozen);
    await resume(page).click();
    await page.clock.runFor(1000);
    await expect(page.locator("#resultText")).toContainText(
      breached === "left" ? "west crossing fell" : "east crossing fell");
    await page.getByRole("button", { name: "TRY AGAIN" }).click();
  }
});
