import { writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
async function snapshot(page) {
  return page.evaluate(async () =>
    (await import("/src/main.js")).getSnapshot(),
  );
}
async function touchAim(page, client, target) {
  const box = await page.locator("#game").boundingBox();
  const s = await snapshot(page);
  const start = { x: box.x + box.width / 2, y: box.y + box.height * 0.88 };
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  for (let i = 1; i <= 5; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: start.x + (((target - s.gunX) / 420) * box.width * i) / 5,
          y: start.y,
        },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect((await snapshot(page)).gunX).toBeCloseTo(target, 1);
}
async function setup(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "DEFEND THE CASTLE" }).click();
  return { errors, client: await page.context().newCDPSession(page) };
}
async function advanceUntil(page, predicate, maxSeconds) {
  for (let i = 0; i < maxSeconds; i++) {
    if (predicate(await snapshot(page))) return;
    await page.clock.runFor(1000);
  }
  expect(predicate(await snapshot(page))).toBe(true);
}
test("touch-only unlocking, marching, final counterattack and complete victory", async ({
  page,
}, testInfo) => {
  const { errors, client } = await setup(page);
  const milestones = [];
  await page.clock.runFor(2000);
  let s = await snapshot(page);
  expect(s.work).toEqual([0, 0]);
  expect(s.squads.length).toBeGreaterThan(0);
  expect(s.blueTotal).toBe(0);
  const smallArmy = Number(
    (await page.locator("#blueCount").innerText()).replaceAll(",", ""),
  );
  await touchAim(page, client, 90);
  await advanceUntil(page, (s) => s.gates[1].open, 15);
  await expect(page.locator("#gate99")).toHaveText("OPEN");
  await expect(page.locator("#gate999")).toHaveText("0%");
  milestones.push({ event: "×99 unlocked", state: await snapshot(page) });
  await page.clock.runFor(4000);
  s = await snapshot(page);
  expect(s.squads.some((q) => q.mult === 99)).toBe(true);
  expect(s.blueTotal).toBeGreaterThan(1000);
  expect(
    Number((await page.locator("#blueCount").innerText()).replaceAll(",", "")),
  ).toBeGreaterThan(smallArmy * 3);
  await touchAim(page, client, 329);
  await advanceUntil(page, (s) => s.gates[2].open, 30);
  await expect(page.locator("#gate999")).toHaveText("OPEN");
  s = await snapshot(page);
  const frontBefore = s.front;
  milestones.push({ event: "×999 unlocked", state: s });
  await advanceUntil(page, (s) => s.finalActivated, 5);
  await expect(page.locator("#banner")).toContainText("COUNTERATTACK");
  await page.clock.runFor(4000);
  s = await snapshot(page);
  expect(s.front).toBeLessThan(frontBefore - 10);
  expect(s.blueTotal).toBeGreaterThan(10000);
  await page.screenshot({ path: testInfo.outputPath("counterattack.png") });
  await advanceUntil(page, (s) => s.mode === "end", 90);
  await expect(page.locator("#resultTitle")).toHaveText("The castle stands!");
  s = await snapshot(page);
  expect(s.redTotal).toBe(0);
  expect(s.front).toBeLessThanOrEqual(30);
  expect(s.t).toBeGreaterThan(60);
  expect(s.t).toBeLessThan(120);
  expect(errors).toEqual([]);
  milestones.push({ event: "victory", state: s });
  await page.screenshot({ path: testInfo.outputPath("victory.png") });
  const evidencePath = testInfo.outputPath("playthrough.json");
  await writeFile(
    evidencePath,
    JSON.stringify({ errors, milestones }, null, 2),
  );
  await testInfo.attach("playthrough", {
    path: evidencePath,
    contentType: "application/json",
  });
  // A genuine restart through the visible result button restores wood and armies.
  await page.getByRole("button", { name: "TRY AGAIN" }).click();
  s = await snapshot(page);
  expect(s.mode).toBe("playing");
  expect(s.work).toEqual([0, 0]);
  await expect(page.locator("#result")).toBeHidden();
  expect(errors).toEqual([]);
});
test("exclusive ×20 defense leaves barricades intact and ends in defeat", async ({
  page,
}, testInfo) => {
  const { errors } = await setup(page);
  await page.clock.runFor(10000);
  expect((await snapshot(page)).work).toEqual([0, 0]);
  await expect(page.locator("#gate99")).toHaveText("0%");
  await advanceUntil(page, (s) => s.mode === "end", 130);
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
