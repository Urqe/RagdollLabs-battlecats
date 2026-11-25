import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { LEVEL_ONE, LEVEL_TWO } from "../../src/levels.js";
import { purrapultAim } from "../helpers/purrapult.js";
import { advanceUntil, setup, snapshot } from "./harness.js";

const select = (page, level) => page.locator(`[data-level="${level.id}"]`);
const checkFresh = async (page, level) => {
  const state = await snapshot(page);
  expect(state.level.id).toBe(level.id);
  expect(state.gunX).toBe(level.battlefield.startX);
  expect(state.work).toEqual(level.barricades.map(() => 0));
  if (level.support) {
    expect(state.support.shot).toBeNull();
    expect(state.support.open).toBe(false);
    expect(state.support.damage).toBe(0);
  } else expect(state.support).toBeNull();
};

test("Level 2 is available immediately and starting, leaving and replaying discard battle state", async ({
  page,
  browserName,
}) => {
  const { aim, errors, hold } = await setup(page, browserName, false);
  await page.getByRole("button", { name: "Choose level" }).click();
  await expect(page.locator(".level-choice:disabled")).toHaveCount(6);
  await expect(select(page, LEVEL_ONE)).toBeEnabled();
  await expect(select(page, LEVEL_TWO)).toBeEnabled();
  await select(page, LEVEL_TWO).click();
  await checkFresh(page, LEVEL_TWO);

  const game = await page.locator("#game").boundingBox();
  const menu = await page.locator("#battleLevels").boundingBox();
  expect(menu.y).toBeGreaterThanOrEqual(game.y + game.height);

  await aim(LEVEL_TWO.support.x);
  await advanceUntil(page, (state) => state.support.shot !== null, 12, 100);
  await page.locator("#battleLevels").click();
  await expect(
    page.getByRole("heading", { name: "Choose a level" }),
  ).toBeVisible();
  await page.clock.runFor(3000);
  expect((await snapshot(page)).support.shot).toBeNull();
  const reset = await snapshot(page);
  expect(reset.t).toBe(0);
  await select(page, LEVEL_ONE).click();
  await checkFresh(page, LEVEL_ONE);
  await page.locator("#battleLevels").click();
  await select(page, LEVEL_TWO).click();
  await checkFresh(page, LEVEL_TWO);

  const defeated = await hold(LEVEL_TWO.support.x, 18000);
  await expect(page.locator("#resultTitle")).toHaveText(
    "The horde broke through",
  );
  expect(defeated.support.damage).toBeGreaterThan(0);
  expect(defeated.support.shot).toBeNull();
  await page.getByRole("button", { name: "TRY AGAIN" }).click();
  await checkFresh(page, LEVEL_TWO);
  await page.locator("#battleLevels").click();
  await expect(select(page, LEVEL_TWO)).toContainText("Play");
  await expect(select(page, LEVEL_TWO)).not.toContainText("Completed");
  await page.getByRole("button", { name: "Main menu" }).click();
  await expect(page.locator("#menuLevel")).toContainText("The Purrapult");
  expect(errors).toEqual([]);
});

test("artillery-assisted defense wins Level 2 and persists its completion", async ({
  page,
  browserName,
}, testInfo) => {
  const { errors, aim } = await setup(page, browserName, false);
  const capture = (name) =>
    page.screenshot({ path: testInfo.outputPath(name) });
  await capture("01-menu.png");
  await page.getByRole("button", { name: "Choose level" }).click();
  await capture("02-level-selection.png");
  await select(page, LEVEL_TWO).click();
  await capture("03-locked-catapult.png");

  const plan = purrapultAim("artillery-first");
  const evidence = [];
  const seen = new Set();
  async function mark(event, name, state) {
    seen.add(event);
    evidence.push({
      event,
      time: state.t,
      front: state.front,
      red: state.redTotal,
      support: state.support,
    });
    await capture(name);
  }
  let s = await snapshot(page);
  let goal = s.gunX;
  for (let tick = 0; tick < 900 && s.mode === "playing"; tick++) {
    const next = plan(s);
    if (next !== goal) {
      await aim(next);
      goal = next;
    }
    await page.clock.runFor(160);
    const previous = s;
    s = await snapshot(page);
    if (s.support.open && !seen.has("unlocked")) {
      await mark("unlocked", "04-barricade-destruction.png", s);
    }
    if (
      s.support.shot &&
      s.t > s.support.shot.launchedAt + 0.35 &&
      !seen.has("flight")
    ) {
      expect(s.support.impacts).toBe(0);
      await mark("flight", "05-yarn-in-flight.png", s);
    }
    if (s.support.damage > previous.support.damage && !seen.has("impact")) {
      expect(s.redTotal).toBeLessThan(previous.redTotal);
      expect(s.support.impact.loss).toBeGreaterThan(0);
      await mark("impact", "06-yarn-impact.png", s);
    }
    if (
      s.gates[1].open &&
      s.support.damage > 700 &&
      s.front < 285 &&
      !seen.has("counterattack")
    ) {
      await mark("counterattack", "07-counterattack.png", s);
    }
  }
  expect([...seen]).toEqual(["unlocked", "flight", "impact", "counterattack"]);
  expect(s.mode).toBe("victory");
  expect(s.redTotal).toBe(0);
  expect(s.support.damage).toBeGreaterThan(1000);
  expect(s.support.shot).toBeNull();
  s = await advanceUntil(page, (state) => state.mode === "end", 3, 200);
  await expect(page.locator("#resultTitle")).toHaveText("The castle stands!");
  await mark("victory", "08-victory.png", s);

  await page.locator("#resultLevels").click();
  await expect(select(page, LEVEL_TWO)).toContainText("Completed");
  await expect(select(page, LEVEL_ONE)).not.toContainText("Completed");
  await page.reload();
  await expect(page.locator("#menuLevel")).toContainText("The Purrapult");
  await page.getByRole("button", { name: "Choose level" }).click();
  await expect(select(page, LEVEL_TWO)).toContainText("Completed");
  await capture("09-completion-marker.png");
  expect(errors).toEqual([]);
  const output = testInfo.outputPath("purrapult-run.json");
  await writeFile(
    output,
    JSON.stringify({ browserName, evidence }, null, 2) + "\n",
  );
  await testInfo.attach("Purrapult milestones", {
    path: output,
    contentType: "application/json",
  });
});
