import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://127.0.0.1:4173";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2,
  });
  await page.goto(url);
  const results = await page.evaluate(async () => {
    const [{ createGame }, { createMotion }, { createRenderer }, { LEVEL_TWO }, { purrapultAim }] =
      await Promise.all([
        import("/src/game.js"), import("/src/motion.js"), import("/src/render.js"),
        import("/src/levels.js"), import("/tests/helpers/purrapult.js"),
      ]);
    document.querySelector("#menu").hidden = true;
    const motion = createMotion();
    const game = createGame({
      level: LEVEL_TWO, onEffect: motion.receive, random: () => 0.5,
    });
    game.reset();
    const { state } = game;
    const renderer = createRenderer(state, document.querySelector("#game"), motion);
    renderer.resize();
    const aim = purrapultAim("artillery-first");
    function advance() {
      state.gunX = aim(state);
      const previous = state.front;
      game.update(1 / 60);
      motion.step(state.t, (state.front - previous) * 60,
        state.blueTotal, state.redEntryOpen, state.level, state);
    }
    function stats(values) {
      values.sort((a, b) => a - b);
      return {
        median: +values[Math.floor(values.length / 2)].toFixed(2),
        p95: +values[Math.floor(values.length * 0.95)].toFixed(2),
      };
    }
    async function sample(step) {
      const counts = { red: Math.ceil(state.redTotal), blue: Math.ceil(state.blueTotal) };
      const submissions = [];
      const intervals = [];
      let start;
      let previous;
      await new Promise((done) => {
        function frame(now) {
          start ??= now;
          if (previous !== undefined) intervals.push(now - previous);
          previous = now;
          const before = performance.now();
          step();
          renderer.draw();
          submissions.push(performance.now() - before);
          if (now - start < 6000) requestAnimationFrame(frame);
          else done();
        }
        requestAnimationFrame(frame);
      });
      return { counts, frames: intervals.length, frameMs: stats(intervals), drawAndStepMs: stats(submissions) };
    }

    for (let i = 0; i < 5900; i++) {
      advance();
      const hit = state.support.impact;
      if (state.finalActivated && hit?.loss > 0 && state.t - hit.at < 0.1 && state.squads.length)
        break;
    }
    const gatesAndArtillery = await sample(advance);
    game.reset();
    motion.reset();
    Object.assign(state, { redTotal: 500000, blueTotal: 200000, redEntryRate: 2200 });
    motion.step(state.t, 0, state.blueTotal, state.redEntryOpen, state.level, state);
    const enormousFixture = await sample(() => { state.t += 1 / 60; });
    let age = 0;
    const populations = [200000, 150000, 100000, 50000, 10000, 1000];
    const rapidDecline = await sample(() => {
      age += 1 / 60;
      state.t += 1 / 60;
      state.blueTotal = populations[Math.min(5, Math.floor(age))];
      motion.step(state.t, 0, state.blueTotal, true, state.level, state);
    });
    return { gatesAndArtillery, enormousFixture, rapidDecline };
  });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
