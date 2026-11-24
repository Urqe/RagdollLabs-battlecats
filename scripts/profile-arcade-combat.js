import { chromium, webkit } from "@playwright/test";

const engine = process.argv[2] === "webkit" ? webkit : chromium;
const viewport = { width: 390, height: 844 };
const browser = await engine.launch();
try {
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(process.env.SIEGE_URL ?? "http://127.0.0.1:4173");
  const phases = await page.evaluate(async () => {
    const [{ createGame }, { createMotion }, { createRenderer }, { createDualRenderer },
      { createDualBattlefield }, { createState }, { createAim }, { dualAim },
      { advanceLaneCombat }, { LEVEL_FOUR }] = await Promise.all([
      import("/src/game.js"), import("/src/motion.js"), import("/src/render.js"),
      import("/src/dual-render.js"), import("/src/dual-battlefield.js"), import("/src/state.js"),
      import("/tests/helpers/strategies.js"), import("/tests/helpers/dual-strategies.js"),
      import("/src/lane-combat.js"), import("/src/levels.js"),
    ]);
    const canvas = document.querySelector("#game");
    document.querySelector("#menu").style.display = "none";
    const dt = 1 / 60;

    function seek(step, predicate, limit = 10000) {
      for (let i = 0; i < limit && !predicate(); i++) step();
      if (!predicate()) throw new Error("Replay never reached the sampling checkpoint");
    }

    function quantiles(values) {
      values.sort((a, b) => a - b);
      return [0.5, 0.95].map(p => +values[Math.floor(p * (values.length - 1))].toFixed(2));
    }

    async function profile(step, renderer, duration = 1600) {
      const frames = [];
      const draw = [];
      let last, start;
      await new Promise(done => {
        function render(now) {
          start ??= now;
          step();
          const before = performance.now();
          renderer.draw();
          const end = performance.now();
          if (now - start > 250 && last !== undefined) {
            frames.push(now - last);
            draw.push(end - before);
          }
          last = now;
          if (now - start >= duration) done();
          else requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
      });
      return { samples: frames.length, frameMs: quantiles(frames), canvasMs: quantiles(draw) };
    }

    const results = {};
    const motion = createMotion();
    const game = createGame({ onEffect: motion.receive, random: () => 0.5 });
    game.reset();
    const aim = createAim("C");
    const state = game.state;
    const single = createRenderer(state, canvas, motion);
    single.resize();
    function stepSingle() {
      const front = state.front;
      state.gunX = aim(state);
      game.update(dt);
      motion.step(state.t + state.victoryElapsed, (state.front - front) / dt,
        state.blueTotal, state.redEntryOpen, state.level, state);
    }
    for (const [key, ready] of [
      ["small", () => state.t >= 1],
      ["growing", () => state.t >= 26],
      ["multiplier999", () => state.finalActivated],
    ]) {
      seek(stepSingle, ready);
      results[key] = await profile(stepSingle, single);
    }

    const connected = createState();
    let renderer;
    const battle = createDualBattlefield({ state: connected, onEvent(e, sim) {
      renderer.receive(e, sim);
    } });
    renderer = createDualRenderer(connected, canvas, battle);
    battle.reset();
    renderer.resize();
    function stepDual() {
      const { lanes, phalanx, time } = battle.state;
      connected.gunX = dualAim("adaptive-imperfect", Math.floor(time + 1e-8), lanes, connected.gates, phalanx);
      battle.advance(dt);
    }
    for (const [key, ready] of [
      ["twoFronts", () => connected.t >= 12],
      ["deployment", () => battle.state.phalanx.phase === "deploying"],
      ["redeployment", () => battle.state.siege.transfers.length > 0],
      ["encirclement", () => battle.state.siege.phase === "encirclement"],
    ]) {
      seek(stepDual, ready);
      results[key] = await profile(stepDual, renderer,
        key === "deployment" ? 1000 : 1600);
    }

    // Exercise the large-army trickle fixture while drawing the real east front.
    battle.reset();
    renderer.reset();
    const right = battle.state.lanes.right;
    Object.assign(right, { front: 240, blueTotal: 300000, redTotal: 0 });
    const rules = { ...LEVEL_FOUR.crossings.right.combat,
      redReinforcements: 4, redReinforcementGrowth: 0 };
    function stepMarch() {
      connected.t += dt;
      battle.state.time += dt;
      advanceLaneCombat(right, rules, right.objective, connected.t, dt);
    }
    seek(stepMarch, () => connected.t >= 1);
    results.overwhelming = await profile(stepMarch, renderer);
    return results;
  });
  console.log(JSON.stringify({ browser: engine.name(), version: browser.version(), viewport, phases }, null, 2));
} finally {
  await browser.close();
}
