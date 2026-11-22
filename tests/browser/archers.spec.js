import { expect, test } from "@playwright/test";

test("the archer fixture renders a draw, flight, misses and repeated volleys", async ({ page }) => {
  await page.goto("/tests/browser/archer-fixture.html");
  await expect(page).toHaveTitle(/Archer visual fixture/);
  const result = await page.evaluate(async () => {
    const { arrowPosition } = await import("/src/archer-render.js");
    const { canvas, motion, state, tick, reset, levelOne } = window.archerFixture;
    const crew = () => canvas.getContext("2d").getImageData(324, 520, 78, 60).data.join();
    const advance = (until) => {
      for (let frame = 0; frame < 180 && !until(); frame++) tick(1 / 120);
      if (!until()) throw new Error("Archer fixture missed its event deadline");
    };

    advance(() => state.support.open);
    const idle = crew();
    advance(() => state.support.readyAt - state.t < 0.08);
    const drew = idle !== crew();
    const first = state.support.shotsFired;
    advance(() => state.support.shotsFired > first);
    const firstLaunch = { ...motion.archers.launch };
    advance(() => state.t >= firstLaunch.launchedAt + 0.09);
    const { x, y } = arrowPosition(firstLaunch, state.t, 2);
    const pixels = canvas.getContext("2d").getImageData(x - 14, y - 7, 18, 24).data;
    const visibleFlight = pixels.some((red, index) => index % 4 === 0 &&
      red >= 245 && pixels[index + 1] >= 210 && pixels[index + 1] <= 225 &&
      pixels[index + 2] >= 148 && pixels[index + 2] <= 164);
    state.front += 125;
    advance(() => state.support.impacts === 1);
    const miss = motion.archers.impact.loss;
    const missCats = motion.airborne.active.length;
    state.front -= 125;
    advance(() => state.support.shotsFired === 2);
    const nextLaunch = { ...motion.archers.launch };
    advance(() => state.support.impacts === 2);
    const hit = motion.archers.impact.loss;
    const distinctStrikes = new Set(motion.archers.impact.points.slice(0, 6)
      .map(({ x, y }) => String([x, y]))).size;
    const reactionCats = motion.airborne.active.length;

    reset();
    const clearedOnRestart = !motion.archers.launch && !motion.archers.impact && !motion.airborne.active.length && !state.support.shot;
    advance(() => state.support.shotsFired === 1);
    reset(levelOne);
    const clearedOnSwitch = !motion.archers.launch && !motion.archers.impact && state.support === null;
    return {
      drew, visibleFlight, firstLaunch, nextLaunch, miss, missCats, hit,
      distinctStrikes, reactionCats, clearedOnRestart, clearedOnSwitch,
    };
  });
  expect(result).toMatchObject({
    drew: true,
    visibleFlight: true,
    firstLaunch: { originX: 361, originY: 555, arrows: 6 },
    miss: 0,
    missCats: 0,
    distinctStrikes: 6,
    reactionCats: 4,
    hit: 48,
    clearedOnRestart: true,
    clearedOnSwitch: true,
  });
  expect(result.nextLaunch.launchedAt).toBeCloseTo(result.firstLaunch.launchedAt + 0.8);
});
