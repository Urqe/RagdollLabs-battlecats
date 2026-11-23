import { test, expect } from "@playwright/test";
import { FLAG_CAPTURE_TIME } from "../../src/army-movement.js";
import { setup, snapshot } from "./harness.js";

const canvasImage = (page) => page.locator("#game").evaluate((canvas) => canvas.toDataURL());

test("pause freezes combat and input through visibility interruptions and level changes", async ({ page, browserName }) => {
  await setup(page, browserName);
  const pause = page.getByRole("button", { name: "Pause" });
  const dialog = page.getByRole("dialog", { name: "GAME PAUSED" });
  const resume = dialog.getByRole("button", { name: "Resume" });
  await page.clock.runFor(7000);
  await pause.tap();
  await expect(resume).toBeFocused();
  const frozen = await snapshot(page);
  const image = await canvasImage(page);
  expect(frozen.blueTotal).toBeGreaterThan(0);
  await page.keyboard.press("ArrowLeft");
  await page.touchscreen.tap(35, 650);
  await page.locator("#game").dispatchEvent("pointermove", {
    pointerType: "mouse",
    clientX: 30,
  });
  await page.clock.fastForward(3600000);
  expect(await snapshot(page)).toEqual(frozen);
  expect(await canvasImage(page)).toBe(image);

  await resume.tap();
  await page.clock.runFor(16);
  expect(await snapshot(page)).toEqual(frozen);
  await page.clock.runFor(100);
  const continued = await snapshot(page);
  expect(continued.t - frozen.t).toBeGreaterThan(0);
  expect(continued.t - frozen.t).toBeLessThan(0.12);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(dialog).toBeVisible();
  await page.clock.fastForward(7200000);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(250);
  await expect(dialog).toBeVisible();
  expect(await snapshot(page)).toEqual(continued);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Restart" }).tap();
  expect(await snapshot(page)).toMatchObject({ t: 0, mode: "playing", level: frozen.level });
  await pause.tap();
  await dialog.getByRole("button", { name: "Levels" }).tap();
  await expect(dialog).toBeHidden();
  await expect(pause).toBeHidden();
  await page.locator('[data-level="purrapult"]').tap();
  await page.clock.runFor(250);
  const switched = await snapshot(page);
  expect(switched.level.number).toBe(2);
  expect(switched.t).toBeGreaterThan(0);
  expect(switched.t).toBeLessThan(0.3);
});

test("pause holds the victory charge, flag raise and result deadline", async ({ page, browserName }) => {
  // Bring the entrance to the decisive tick without a full playthrough.
  await page.route("**/src/main.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()) + "\nexport function secureEntrance() { " +
        "Object.assign(state, { blueTotal: 150, redTotal: 0, redEntryOpen: false, front: 98 }); }",
    });
  });
  await setup(page, browserName);
  await page.evaluate(async () => (await import("/src/main.js")).secureEntrance());
  await page.clock.runFor(350);

  const pause = page.getByRole("button", { name: "Pause" });
  const resume = page.getByRole("button", { name: "Resume" });
  for (const captured of [false, true]) {
    await pause.tap();
    const frozen = await snapshot(page);
    const image = await canvasImage(page);
    expect(frozen.mode).toBe("victory");
    expect(frozen.victoryElapsed >= FLAG_CAPTURE_TIME).toBe(captured);
    await page.clock.fastForward(60000);
    expect(await snapshot(page)).toEqual(frozen);
    expect(await canvasImage(page)).toBe(image);
    await expect(page.locator("#result")).toBeHidden();
    await resume.tap();
    await page.clock.runFor(captured ? 1600 : 700);
  }

  await expect(page.locator("#result")).toBeVisible();
  await expect(pause).toBeHidden();
});
