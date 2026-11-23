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

test("Level 4 is directly selectable and keeps two independent fronts through pause and restart", async ({ page, browserName }) => {
  const { errors, hold } = await setup(page, browserName, false);
  await selectTwoTails(page);
  const s = await hold(166, 15000);
  expect(s.dual.lanes.left.front).toBeLessThan(335);
  expect(s.dual.lanes.right.front).toBeGreaterThan(432);
  expect(s.feedback.left.arrivalAt).toBeGreaterThan(0);
  expect(s.feedback.right.arrivalAt).toBe(-Infinity);
  expect(s.feedback.left.danger).toBe(false);
  expect(s.feedback.right.danger).toBe(true);

  const canvas = page.locator("#game");
  const box = await canvas.boundingBox();
  expect(box.width).toBe(390);
  expect(box.height).toBeGreaterThan(700);
  const pixels = await canvas.evaluate((element, fronts) => {
    const ctx = element.getContext("2d");
    return fronts.map(([x, y]) => [...ctx.getImageData(x, Math.floor(y), 1, 1).data]);
  }, [[36, s.dual.lanes.left.front], [232, s.dual.lanes.right.front]]);
  const expected = [[121, 217, 255, 255], [255, 152, 136, 255]];
  for (const [lane, pixel] of pixels.entries())
    expect(Math.max(...pixel.map((channel, i) => Math.abs(channel - expected[lane][i])))).toBeLessThan(12);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const paused = await snapshot(page);
  const image = await canvasImage(page);
  await page.clock.fastForward(3600000);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(resume(page)).toBeVisible();
  expect(await snapshot(page)).toEqual(paused);
  expect(await canvasImage(page)).toBe(image);
  await resume(page).click();
  const switched = await hold(254, 3000);
  expect(switched.t - paused.t).toBeLessThan(3.1);
  expect(switched.feedback.right.arrivalAt).toBeGreaterThan(paused.t);
  expect(switched.dual.lanes.right.squads.every(squad => squad.origin > 210)).toBe(true);

  await pause(page).click();
  await page.getByRole("button", { name: "Restart" }).click();
  const restarted = await snapshot(page);
  expect(restarted.t).toBe(0);
  expect(restarted.work).toEqual([0, 0]);
  expect(restarted.feedback.right.danger).toBe(false);
  expect(restarted.shots).toHaveLength(0);
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await page.locator("[data-level='purrapult']").click();
  const other = await snapshot(page);
  expect(other.dual).toBeUndefined();
  expect(other.level.number).toBe(2);
  expect(errors).toEqual([]);
});

test("public playthrough opens both gates, captures both flags, and persists victory", async ({ page, browserName }) => {
  const { aim, errors } = await setup(page, browserName, false);
  await selectTwoTails(page);
  let s = await snapshot(page);
  for (let second = 0; second < 105 && s.mode === "playing"; second++) {
    const target = dualAim("upgrade-focused", second, s.dual.lanes, s.gates);
    if (Math.abs(s.gunX - target) > 2) await aim(target);
    await page.clock.runFor(1000);
    s = await snapshot(page);
  }
  expect(s.mode).toBe("victory");
  expect(s.work).toEqual([42, 42]);
  for (const lane of Object.values(s.dual.lanes)) {
    expect(lane.redEntryOpen).toBe(false);
    expect(lane.redTotal).toBe(0);
  }
  await expect(page.locator("#result")).toBeHidden();
  await pause(page).click();
  const frozen = await snapshot(page);
  const image = await canvasImage(page);
  const redFlags = await supplyFlags(page, [166, 80, 67]);
  for (const count of redFlags) expect(count).toBeGreaterThan(120);
  await page.clock.fastForward(60000);
  expect(await snapshot(page)).toEqual(frozen);
  expect(await canvasImage(page)).toBe(image);
  await expect(page.locator("#result")).toBeHidden();
  await resume(page).click();
  const flags = await advanceUntil(page,
    next => next.victoryElapsed >= FLAG_CAPTURE_TIME + FLAG_RAISE_TIME, 2, 100);
  expect(flags.mode).toBe("victory");
  expect(flags.dual).toEqual(frozen.dual);
  const raised = await supplyFlags(page, [50, 143, 232]);
  for (const count of raised) expect(count).toBeGreaterThan(120);
  await expect(page.locator("#result")).toBeHidden();
  await page.clock.runFor(2500);
  await expect(page.getByRole("heading", { name: "The castle stands!" })).toBeVisible();

  await page.reload();
  await expect(page.locator("#menuLevel")).toHaveText("Level 4 · A Tale of Two Tails");
  await page.getByRole("button", { name: "Choose level" }).click();
  await expect(page.locator("[data-level='two-tails']")).toContainText("Completed");
  expect(errors).toEqual([]);
});

test("both neglect strategies show a pausable reaction naming the breached crossing", async ({ page, browserName }) => {
  const { hold } = await setup(page, browserName, false);
  await selectTwoTails(page);
  for (const [target, breached, held] of [[166, "right", "left"], [254, "left", "right"]]) {
    await hold(target, 21000);
    const s = await advanceUntil(page, next => next.mode === "defeat", 5, 100);
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

async function supplyFlags(page, color) {
  return page.locator("#game").evaluate((canvas, rgb) => {
    const ctx = canvas.getContext("2d");
    // Both cloths start at their supply road centerlines, just below the HUD.
    return [112, 308].map(x => {
      const { data } = ctx.getImageData(x, 91, 36, 17);
      let count = 0;
      for (let i = 0; i < data.length; i += 4)
        if (rgb.every((channel, j) => data[i + j] === channel)) count++;
      return count;
    });
  }, color);
}

async function leadingCats(page) {
  return page.locator("#game").evaluate(canvas => {
    const ctx = canvas.getContext("2d");
    // Sample the approach to each pole, on the opposite side from the cloth.
    return [62, 258].map(x => {
      const { data } = ctx.getImageData(x, 96, 46, 20);
      let count = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i] < 100 && data[i + 1] > 100 && data[i + 2] > 180) count++;
      return count;
    });
  });
}

test("restart and level selection cancel a paused two-flag celebration", async ({ page, browserName }) => {
  await page.route("**/src/main.js", async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()) + `
        export function secureCrossings(redTotal = 0) {
          for (const lane of Object.values(dual.state.lanes))
            Object.assign(lane, { redTotal, redEntryOpen: false, front: 118 });
        }`,
    });
  });
  await setup(page, browserName, false);
  await selectTwoTails(page);
  await page.evaluate(async () => (await import("/src/main.js")).secureCrossings(110));
  await page.clock.runFor(50);
  // The remaining defenders must be visible at the supply points at cutoff.
  const defenders = await page.locator("#game").evaluate(canvas => {
    const ctx = canvas.getContext("2d");
    return [85, 281].map(x => {
      const { data } = ctx.getImageData(x, 92, 60, 23);
      let count = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i] > 150 && data[i] > data[i + 1] * 1.5) count++;
      return count;
    });
  });
  for (const count of defenders) expect(count).toBeGreaterThan(20);
  for (const action of ["Restart", "Levels"]) {
    await page.evaluate(async () => (await import("/src/main.js")).secureCrossings());
    await page.clock.runFor(50);
    const approaching = await leadingCats(page);
    await page.clock.runFor(780);
    expect((await snapshot(page)).victoryElapsed).toBeLessThan(FLAG_CAPTURE_TIME);
    const charged = await leadingCats(page);
    for (let lane = 0; lane < 2; lane++) expect(charged[lane]).toBeGreaterThan(approaching[lane] + 25);
    for (const count of await supplyFlags(page, [50, 143, 232])) expect(count).toBe(0);
    expect((await snapshot(page)).mode).toBe("victory");
    await pause(page).click();
    await page.getByRole("dialog").getByRole("button", { name: action }).click();
    await page.clock.runFor(3500);
    await expect(page.locator("#result")).toBeHidden();
    if (action === "Restart") expect((await snapshot(page)).dual.outcome).toBeNull();
    else expect((await snapshot(page)).dual).toBeUndefined();
  }
});
