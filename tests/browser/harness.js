import { expect } from "@playwright/test";
export async function snapshot(page) {
  return page.evaluate(async () =>
    (await import("/src/main.js")).getSnapshot(),
  );
}
async function touchAim(page, client, target) {
  const box = await page.locator("#game").boundingBox();
  const s = await snapshot(page);
  const start = {
    x: box.x + (s.gunX / 420) * box.width,
    y: box.y + box.height * 0.88,
  };
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
export async function setup(page, browserName, start = true, path = "/") {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.clock.install();
  await page.goto(path);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  if (start)
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
  return { errors, hold, aim };
}

export async function advanceUntil(page, predicate, maxSeconds, step = 1000) {
  let s = await snapshot(page);
  for (
    let elapsed = 0;
    elapsed < maxSeconds * 1000 && !predicate(s);
    elapsed += step
  ) {
    await page.clock.runFor(step);
    s = await snapshot(page);
  }
  expect(predicate(s)).toBe(true);
  return s;
}
