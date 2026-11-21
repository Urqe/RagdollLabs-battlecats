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
async function setup(page, browserName) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "DEFEND THE CASTLE" }).click();
  const client =
    browserName === "chromium"
      ? await page.context().newCDPSession(page)
      : null;
  async function aim(target) {
    if (client) return touchAim(page, client, target);
    const box = await page.locator("#game").boundingBox();
    await page.mouse.move(
      box.x + (box.width * target) / 420,
      box.y + box.height * 0.88,
    );
    expect(Math.abs((await snapshot(page)).gunX - target)).toBeLessThan(2);
  }
  async function hold(target, ms) {
    await aim(target);
    await page.clock.runFor(ms);
    return snapshot(page);
  }
  return { errors, hold };
}

async function advanceUntil(page, predicate, maxSeconds) {
  for (let i = 0; i < maxSeconds; i++) {
    if (predicate(await snapshot(page))) return;
    await page.clock.runFor(1000);
  }
  expect(predicate(await snapshot(page))).toBe(true);
}

function battlefield(s) {
  return {
    seconds: s.t,
    front: s.front,
    red: s.redTotal,
    blue: s.blueTotal,
    redEntryRate: s.redEntryRate,
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
  expect(s.blueTotal).toBe(0);

  await page.clock.runFor(5000);
  for (let i = 0; i < 4; i++) {
    await hold(210, 900);
    s = await hold(90, 3100);
    if (s.gates[1].open) break;
    expect(s.work[0]).toBeGreaterThan(0);
    expect(s.work[1]).toBe(0);
  }
  await expect(page.locator("#gate99")).toHaveText("OPEN");
  await expect(page.locator("#gate999")).toHaveText("0%");
  const atUnlock = s.front;
  milestones.push({ event: "×99 unlocked", ...battlefield(s) });

  await page.clock.runFor(5000);
  for (let i = 0; i < 9; i++) {
    s = await hold(90, 1850);
    if (i === 1) {
      expect(s.front).toBeLessThan(atUnlock - 25);
      expect(s.squads.some((q) => q.mult === 99)).toBe(true);
      milestones.push({ event: "×99 reverses the battle", ...battlefield(s) });
      await page.screenshot({
        path: testInfo.outputPath("phase-2-reversal.png"),
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
  await expect(page.locator("#gate999")).toHaveText("OPEN");
  expect(s.finalActivated).toBe(false);
  expect(s.front).toBeGreaterThan(milestones[1].front + 100);
  expect(s.redTotal).toBeGreaterThan(milestones[1].red * 2);
  const frontBefore = s.front;
  milestones.push({ event: "×999 unlocked", ...battlefield(s) });
  await advanceUntil(page, (state) => state.finalActivated, 5);
  await expect(page.locator("#banner")).toContainText("REINFORCEMENTS ARRIVED");
  const arrival = await snapshot(page);
  milestones.push({
    event: "×999 reaches the frontline",
    ...battlefield(arrival),
  });

  await page.clock.runFor(17000);
  s = await snapshot(page);
  expect(s.front).toBeLessThan(frontBefore - 130);
  expect(s.blueTotal).toBeGreaterThan(10000);
  expect(s.redTotal).toBeLessThan(arrival.redTotal * 0.75);
  expect(s.redTotal).toBeGreaterThan(0);
  milestones.push({ event: "×999 counterattack", ...battlefield(s) });
  await page.screenshot({
    path: testInfo.outputPath("phase-3-counterattack.png"),
  });

  await advanceUntil(page, (state) => state.mode === "end", 75);
  await expect(page.locator("#resultTitle")).toHaveText("The castle stands!");
  s = await snapshot(page);
  expect(s.redTotal).toBe(0);
  expect(s.front).toBeLessThanOrEqual(30);
  expect(s.t).toBeGreaterThan(60);
  expect(s.t).toBeLessThan(120);
  milestones.push({ event: "victory", ...battlefield(s) });
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
  await expect(page.locator("#result")).toBeHidden();
  expect(errors).toEqual([]);
});

test("exclusive ×20 initially advances before the horde overtakes it", async ({
  page,
  browserName,
}, testInfo) => {
  const { errors } = await setup(page, browserName);
  const initial = await snapshot(page);
  await page.clock.runFor(13000);
  const early = await snapshot(page);
  expect(early.front).toBeLessThan(initial.front - 25);
  expect(early.blueTotal).toBeGreaterThan(400);
  await page.screenshot({ path: testInfo.outputPath("phase-1-advance.png") });

  await page.clock.runFor(23000);
  const pressure = await snapshot(page);
  expect(pressure.front).toBeGreaterThan(initial.front + 50);
  expect(pressure.redTotal).toBeGreaterThan(early.redTotal * 2);
  expect(pressure.work).toEqual([0, 0]);
  await expect(page.locator("#gate99")).toHaveText("0%");
  await page.screenshot({ path: testInfo.outputPath("phase-1-retreat.png") });

  await advanceUntil(page, (s) => s.mode === "end", 30);
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
  await hold(90, 8500);
  await expect(page.locator("#gate99")).toHaveText("OPEN");
  await page.clock.runFor(4000);
  const reserve = await snapshot(page);
  expect(reserve.blueTotal).toBeGreaterThan(1000);
  await hold(329, 25000);
  await expect(page.locator("#resultTitle")).toHaveText(
    "The horde broke through",
  );
  const s = await snapshot(page);
  expect(s.work[1]).toBeGreaterThan(0);
  expect(s.finalActivated).toBe(false);
  expect(errors).toEqual([]);
});
