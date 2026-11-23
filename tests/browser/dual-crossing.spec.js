import { test, expect } from "@playwright/test";
import { advanceUntil, setup, snapshot } from "./harness.js";

const url = "/?fixture=dual-crossing";

test("portrait fixture shows two fronts and holds local pressure through pause and restart", async ({ page, browserName }) => {
  const { errors, hold } = await setup(page, browserName, true, url);
  const s = await hold(166, 6200);
  expect(s.dual.lanes.left.front).toBeLessThan(310);
  expect(s.dual.lanes.right.front).toBeGreaterThan(378);
  expect(s.feedback.left.arrivalAt).toBeGreaterThan(0);
  expect(s.feedback.right.arrivalAt).toBe(-Infinity);
  expect(s.feedback.left.danger).toBe(false);
  expect(s.feedback.right.danger).toBe(true);

  const canvas = page.locator("#game");
  const box = await canvas.boundingBox();
  expect(box.width).toBe(390);
  expect(box.height).toBeGreaterThan(700);
  // Sample the first dash of each lane's actual Canvas frontline.
  const pixels = await canvas.evaluate((element, fronts) => {
    const ctx = element.getContext("2d");
    return fronts.map(([x, y]) => [...ctx.getImageData(x, Math.floor(y), 1, 1).data]);
  }, [[36, s.dual.lanes.left.front], [232, s.dual.lanes.right.front]]);
  const expected = [[121, 217, 255, 255], [255, 152, 136, 255]];
  for (const [lane, pixel] of pixels.entries())
    expect(Math.max(...pixel.map((channel, i) => Math.abs(channel - expected[lane][i])))).toBeLessThan(12);

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await snapshot(page);
  await page.clock.runFor(3000);
  expect(await snapshot(page)).toEqual(paused);
  await page.getByRole("button", { name: "Resume" }).click();
  const switched = await hold(254, 2500);
  expect(switched.feedback.right.arrivalAt).toBeGreaterThan(paused.t);
  expect(switched.dual.lanes.right.squads.every(squad => squad.origin > 210)).toBe(true);

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Restart" }).click();
  const restarted = await snapshot(page);
  expect(restarted.t).toBe(0);
  expect(restarted.work).toEqual([0, 0]);
  expect(restarted.feedback.right.danger).toBe(false);
  expect(restarted.shots).toHaveLength(0);

  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await expect(page.locator("[data-level='two-tails']")).toBeDisabled();
  expect((await snapshot(page)).dual).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem("siegedolls.progress"))).toBeNull();
  expect(errors).toEqual([]);
});

test("both upgrades can be exercised and the fixture can win or lose using normal input", async ({ page, browserName }) => {
  const { hold } = await setup(page, browserName, true, url);
  let s;
  for (let stage = 0; stage < 10; stage++) {
    s = await hold(stage % 2 ? 352 : 68, 3000);
    if (s.dual.outcome) break;
  }
  expect(s.dual.outcome).toBe("victory");
  expect(s.work).toEqual([15, 15]);
  await expect(page.getByRole("heading", { name: "The castle stands!" })).toBeVisible();
  await page.getByRole("button", { name: "TRY AGAIN" }).click();
  s = await advanceUntil(page, next => next.dual.outcome === "defeat", 13);
  expect(s.dual.lanes.right.breached).toBe(true);
  expect(s.dual.lanes.left.breached).toBe(false);
  await expect(page.locator("#resultText")).toContainText("east crossing fell");
});
