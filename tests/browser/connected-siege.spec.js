import { test, expect } from "@playwright/test";
import { dualAim } from "../helpers/dual-strategies.js";
import { setup, snapshot } from "./harness.js";

const select = async (page, id) => {
  await page.getByRole("button", { name: "Choose level" }).click();
  await page.locator(`[data-level="${id}"]`).click();
};

test("connected battlefield is public and the selector still opens Level 1", async ({ page, browserName }) => {
  await setup(page, browserName, false);
  await select(page, "two-tails");
  const released = await snapshot(page);
  expect(released.dual.siege.phase).toBe("twoFronts");
  expect(released.presentation.phase).toBe("locked");
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await page.locator('[data-level="last-stand"]').click();
  expect((await snapshot(page)).dual).toBeUndefined();
});

test("connected siege shows deployment, troop travel, rear combat and the result", async ({ page, browserName }) => {
  const { aim, errors } = await setup(page, browserName, false);
  await select(page, "two-tails");
  let s = await snapshot(page);
  const check = async () => {
    s = await snapshot(page);
    const p = s.presentation;
    expect(p.leftBlue).toBe(s.dual.lanes.left.blueTotal);
    expect(p.rightBlue).toBe(s.dual.lanes.right.blueTotal);
    expect(p.leftRed).toBe(s.dual.lanes.left.redTotal);
    expect(p.rightRed).toBe(s.dual.lanes.right.redTotal);
    expect(p.phase).toBe(s.dual.phalanx.phase);
    expect(p.metrics.flights).toBeLessThanOrEqual(24);
    return p;
  };
  const initial = await check();
  expect(initial.metrics.represented).toBeGreaterThan(420);

  const phases = new Set();
  let sawOrdinaryVolley = false, sawSiege = false, paused = false;
  let simultaneousReactions = false, sawFlankMarch = false, sawRear = false;
  for (let second = 0; second < 160 && s.mode === "playing"; second++) {
    const target = dualAim("adaptive-seven", second, s.dual.lanes, s.gates, s.dual.phalanx);
    if (Math.abs(s.gunX - target) > 2) await aim(target);
    await page.clock.runFor(1000);
    const p = await check();
    phases.add(p.phase);
    simultaneousReactions ||= p.nonlethal > 0 && p.defeated > 0;
    sawOrdinaryVolley ||= s.dual.lanes.left.squads.some(squad => squad.multiplier === 20);
    sawSiege ||= s.dual.lanes.right.squads.some(squad => squad.multiplier === 999) &&
      p.metrics.cohorts > 0 && p.metrics.represented > 1000;
    sawFlankMarch ||= s.dual.siege.phase === "flanking" && p.flank && p.metrics.cohorts > 0;
    sawRear ||= s.dual.siege.phase === "encirclement" && p.flank && s.dual.siege.rearRedLost > 0;
    if (!paused && p.transfers > 0) {
      paused = true;
      expect(p.leftBlue).toBe(0);
      expect(p.lockAt).toBeGreaterThan(0);
      await expect(page.locator("#banner")).toHaveText("WEST SECURED · INFANTRY REDEPLOYING");
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const frozen = await snapshot(page);
      const canvas = page.locator("#game");
      const frame = () => canvas.evaluate(node => node.toDataURL());
      const image = await frame();
      await page.clock.fastForward(60000);
      expect(await snapshot(page)).toEqual(frozen);
      expect(await frame()).toBe(image);
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      // Resume establishes a wall clock baseline on its first frame.
      await page.clock.runFor(17);
    }
  }

  expect(s.mode).toBe("victory");
  expect(s.dual.time).toBeGreaterThan(100);
  expect(s.dual.time).toBeLessThan(150);
  for (const phase of ["locked", "marching", "deploying", "secured"]) expect(phases.has(phase)).toBe(true);
  expect([sawOrdinaryVolley, sawSiege, paused, simultaneousReactions, sawFlankMarch, sawRear])
    .toEqual([true, true, true, true, true, true]);
  expect(s.presentation.shieldAt).toBeGreaterThan(s.presentation.lockAt);
  expect(s.presentation.thrustAt).toBe(s.presentation.shieldAt);
  expect(s.presentation.breakthroughAt).toBeLessThan(s.dual.time);
  expect(s.presentation.routed.count).toBe(s.dual.retreat.count);
  const victoryTime = s.dual.time;
  await expect(page.locator("#result")).toBeHidden();
  await page.clock.runFor(3500);
  await expect(page.getByRole("heading", { name: "The castle stands!" })).toBeVisible();
  expect((await snapshot(page)).dual.time).toBe(victoryTime);

  await page.getByRole("button", { name: "TRY AGAIN" }).click();
  const restarted = await snapshot(page);
  expect(restarted.presentation).toMatchObject({ phase: "locked", transfers: 0, flank: false,
    routed: null, nonlethal: 0, defeated: 0 });
  await page.getByRole("button", { name: "Levels", exact: true }).click();
  await page.locator('[data-level="purrapult"]').click();
  expect((await snapshot(page)).presentation).toBeUndefined();
  expect(errors).toEqual([]);
});
