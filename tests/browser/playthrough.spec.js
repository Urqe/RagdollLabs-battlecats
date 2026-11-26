import { writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { FLAG_CAPTURE_TIME, FLAG_RAISE_TIME } from "../../src/army-movement.js";
import { LEVEL } from "../../src/config.js";
import { advanceUntil, setup, snapshot } from "./harness.js";

async function flagIsBlue(page) {
  return page.locator("#game").evaluate((canvas, flagY) => {
    const ctx = canvas.getContext("2d");
    const scale = canvas.width / 420;
    const { data } = ctx.getImageData(
      213 * scale, (flagY - 30) * scale, 18 * scale, 12 * scale,
    );
    let blue = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 50 && data[i + 1] === 143 && data[i + 2] === 232) blue++;
    }
    return blue > 40;
  }, LEVEL.flagY);
}

function battlefield(s) {
  return {
    seconds: s.t,
    front: s.front,
    red: s.redTotal,
    blue: s.blueTotal,
    redEntryRate: s.redEntryRate,
    redEntryOpen: s.redEntryOpen,
    victoryElapsed: s.victoryElapsed,
    work: s.work,
    marching: s.squads.reduce((count, q) => count + q.count, 0),
  };
}

test("balanced reinforcements reverse the battle twice and clear the field", async ({
  page,
  browserName,
}, testInfo) => {
  const { errors, hold } = await setup(page, browserName);
  const milestones = [];
  const initial = await snapshot(page);
  await page.clock.runFor(1000);
  let s = await snapshot(page);
  expect(s.work).toEqual([0, 0]);
  expect(s.squads.length).toBeGreaterThan(0);
  expect(s.blueTotal).toBeLessThan(initial.blueTotal);

  await page.clock.runFor(5000);
  for (let i = 0; i < 4; i++) {
    await hold(210, 900);
    s = await hold(90, 3100);
    if (s.gates[1].open) break;
    expect(s.work[0]).toBeGreaterThan(0);
    expect(s.work[1]).toBe(0);
  }
  await expect(page.locator("#gate25")).toHaveText("OPEN");
  await expect(page.locator("#gate100")).toHaveText("0%");
  const atUnlock = s.front;
  milestones.push({ event: "×25 unlocked", ...battlefield(s) });

  await page.clock.runFor(5000);
  for (let i = 0; i < 9; i++) {
    s = await hold(90, 1850);
    if (i === 1) {
      expect(s.front).toBeLessThan(atUnlock + 10);
      expect(s.squads.some((q) => q.mult === 25)).toBe(true);
      milestones.push({ event: "×25 reverses the battle", ...battlefield(s) });
      await page.screenshot({
        path: testInfo.outputPath("phase-2-reversal.png"),
      });
    }
    if (i === 6) {
      milestones.push({ event: "renewed red pressure", ...battlefield(s) });
      await page.screenshot({
        path: testInfo.outputPath("phase-2-pressure.png"),
      });
    }
    const damage = s.work[1];
    await hold(329, 250);
    for (let elapsed = 250; elapsed < 3250; elapsed += 250) {
      s = await snapshot(page);
      if (s.gates[2].open) break;
      await page.clock.runFor(250);
    }
    s = await snapshot(page);
    expect(s.work[1]).toBeGreaterThan(damage);
    if (s.gates[2].open) break;
  }
  await expect(page.locator("#gate100")).toHaveText("OPEN");
  expect(s.finalActivated).toBe(false);
  expect(s.front).toBeGreaterThan(milestones[1].front + 55);
  expect(s.redTotal).toBeGreaterThan(milestones[1].red * 2);
  const frontBefore = s.front;
  milestones.push({ event: "×100 unlocked", ...battlefield(s) });
  const multiplying = await advanceUntil(
    page,
    (state) =>
      state.squads.some(
        (q) => q.mult === 100 && q.marchTime > 0.18 && q.marchTime < 0.25,
      ),
    2,
    40,
  );
  await page.screenshot({
    path: testInfo.outputPath("phase-3-multiplication.png"),
  });
  milestones.push({
    event: "×100 multiplying at the gate",
    ...battlefield(multiplying),
  });
  const arrival = await advanceUntil(page, (state) => state.finalActivated, 5);
  await expect(page.locator("#banner")).toContainText("REINFORCEMENTS ARRIVED");
  milestones.push({
    event: "×100 reaches the frontline",
    ...battlefield(arrival),
  });

  await page.clock.runFor(17000);
  s = await snapshot(page);
  expect(s.front).toBeLessThan(frontBefore - 80);
  expect(s.blueTotal).toBeGreaterThan(4000);
  expect(s.redTotal).toBeLessThan(arrival.redTotal * 0.75);
  expect(s.redTotal).toBeGreaterThan(0);
  milestones.push({ event: "×100 counterattack", ...battlefield(s) });
  await page.screenshot({
    path: testInfo.outputPath("phase-3-counterattack.png"),
  });

  const cutoff = await advanceUntil(page, (state) => !state.redEntryOpen, 40);
  expect(cutoff.mode).toBe("playing");
  expect(cutoff.redTotal).toBeGreaterThan(0);
  milestones.push({ event: "supply entrance secured", ...battlefield(cutoff) });

  const cleared = await advanceUntil(
    page,
    (state) => state.mode === "victory",
    10,
    100,
  );
  expect(cleared.redTotal).toBe(0);
  expect(cleared.t).toBeGreaterThan(60);
  expect(cleared.t).toBeLessThan(120);
  expect(cleared.front).toBeGreaterThan(30);
  await expect(page.locator("#result")).toBeHidden();
  expect(await flagIsBlue(page)).toBe(false);
  expect(await page.evaluate(async () => (await import("/src/progress.js")).readProgress()))
    .toMatchObject({ completed: [cleared.level.id] });
  await page.keyboard.press("ArrowLeft");
  await page.clock.runFor(850);
  s = await snapshot(page);
  expect(s.mode).toBe("victory");
  expect(s.victoryElapsed).toBeGreaterThan(0.7);
  expect(s.front).toBe(cleared.front);
  expect(s.gunX).toBe(cleared.gunX);
  expect(s.t).toBe(cleared.t);
  milestones.push({
    event: "cleared battlefield celebration",
    ...battlefield(s),
  });
  await page.screenshot({ path: testInfo.outputPath("phase-3-cleared.png") });

  await advanceUntil(page, (state) =>
    state.victoryElapsed >= FLAG_CAPTURE_TIME + FLAG_RAISE_TIME, 1, 50);
  expect(await flagIsBlue(page)).toBe(true);
  await expect(page.locator("#result")).toBeHidden();
  s = await advanceUntil(page, (state) => state.mode === "end", 2, 100);
  await expect(page.locator("#resultTitle")).toHaveText("The castle stands!");
  expect(s.victoryElapsed).toBe(LEVEL.victoryDuration);
  expect(s.front).toBe(cleared.front);
  expect(s.t).toBe(cleared.t);
  milestones.push({ event: "victory result", ...battlefield(s) });
  await page.screenshot({ path: testInfo.outputPath("victory.png") });
  const evidencePath = testInfo.outputPath("playthrough.json");
  await writeFile(
    evidencePath,
    JSON.stringify({ browserName, milestones }, null, 2),
  );
  await testInfo.attach("playthrough", {
    path: evidencePath,
    contentType: "application/json",
  });

  await page.getByRole("button", { name: "TRY AGAIN" }).click();
  s = await snapshot(page);
  expect(s.mode).toBe("playing");
  expect(s.work).toEqual([0, 0]);
  expect(s.front).toBe(initial.front);
  expect(s.blueTotal).toBe(initial.blueTotal);
  expect(s.redTotal).toBe(initial.redTotal);
  expect(s.squads).toEqual([]);
  expect(s.finalActivated).toBe(false);
  expect(s.redEntryOpen).toBe(true);
  expect(s.victoryElapsed).toBe(0);
  await expect(page.locator("#result")).toBeHidden();
  expect(errors).toEqual([]);
});

test("exclusive ×5 initially advances before the horde overtakes it", async ({
  page,
  browserName,
}, testInfo) => {
  const { errors } = await setup(page, browserName);
  const initial = await snapshot(page);
  await page.clock.runFor(13000);
  const early = await snapshot(page);
  expect(early.front).toBeLessThan(initial.front);
  expect(early.blueTotal).toBeGreaterThan(140);
  await page.screenshot({ path: testInfo.outputPath("phase-1-advance.png") });

  await page.clock.runFor(23000);
  const pressure = await snapshot(page);
  expect(pressure.front).toBeGreaterThan(initial.front + 50);
  expect(pressure.redTotal).toBeGreaterThan(early.redTotal * 2);
  expect(pressure.work).toEqual([0, 0]);
  await expect(page.locator("#gate25")).toHaveText("0%");
  await page.screenshot({ path: testInfo.outputPath("phase-1-retreat.png") });

  await advanceUntil(page, (s) => s.mode === "end", 35);
  await expect(page.locator("#resultTitle")).toHaveText(
    "The horde broke through",
  );
  const s = await snapshot(page);
  expect(s.front).toBeGreaterThanOrEqual(690);
  expect(s.work).toEqual([0, 0]);
  expect(s.finalActivated).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("defeat.png") });
});

test("aggressive unlocking starves the line before the final wave arrives", async ({
  page,
  browserName,
}) => {
  const { errors, hold } = await setup(page, browserName);
  await hold(329, 25000);
  await expect(page.locator("#resultTitle")).toHaveText(
    "The horde broke through",
  );
  const s = await snapshot(page);
  expect(s.work[1]).toBeGreaterThan(0);
  expect(s.finalActivated).toBe(false);
  expect(errors).toEqual([]);
});

test("a portrait warning lets the player exchange barricade fire for reinforcements", async ({
  page, browserName,
}) => {
  const { aim, hold, errors } = await setup(page, browserName);
  async function reachWarning() {
    const opened = await hold(90, 8500);
    expect(opened.gates[1].open).toBe(true);
    await page.clock.runFor(3350);
    await aim(329);
    const warned = await advanceUntil(page, s => s.danger.level === "pressure", 10, 100);
    await expect(page.getByRole("status")).toContainText("AIM AT ×25");
    expect(warned.work[1]).toBeGreaterThan(0);
    return warned;
  }

  const ignored = await reachWarning();
  await page.clock.runFor(4550);
  const ignoredFront = (await snapshot(page)).front;
  await page.locator("#battleLevels").click();
  await page.locator('[data-level="last-stand"]').click();
  const warned = await reachWarning();
  expect(warned.front).toBeCloseTo(ignored.front, 0);
  await page.clock.runFor(550);
  const relieved = await hold(90, 4000);
  expect(relieved.blueTotal).toBeGreaterThan(warned.blueTotal + warned.gates[1].mult * 9);
  expect(relieved.front).toBeLessThan(ignoredFront - 10);
  expect(relieved.danger.level).toBe("stable");
  await expect(page.locator("#danger")).toBeHidden();
  expect(errors).toEqual([]);
});
