import { chromium, webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const engine = process.argv[2] === "webkit" ? webkit : chromium;
const output = process.argv[3];
const viewport = { width: 390, height: 844 };
const executablePath = engine === chromium ? process.env.CHROMIUM_PATH : undefined;
const browser = await engine.launch({ executablePath });
try {
  if (output) await mkdir(output, { recursive: true });
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(process.env.SIEGE_URL ?? "http://127.0.0.1:4173");
  const report = {};
  for (let level = 1; level <= 4; level++) {
    const setup = async number => {
      const [{ createGame }, { createMotion }, { createRenderer }, { createDualRenderer },
        { createDualBattlefield }, { createState }, { LEVELS }, { createAim }, { dualAim },
        { purrapultAim }, { meowmenAim }] = await Promise.all([
        import("/src/game.js"), import("/src/motion.js"), import("/src/render.js"),
        import("/src/dual-render.js"), import("/src/dual-battlefield.js"), import("/src/state.js"),
        import("/src/levels.js"), import("/tests/helpers/strategies.js"), import("/tests/helpers/dual-strategies.js"),
        import("/tests/helpers/purrapult.js"), import("/tests/helpers/meowmen.js"),
      ]);
      const level = LEVELS[number - 1];
      const canvas = document.querySelector("#game");
      document.querySelector("#menu").hidden = true;
      const dt = 1 / 60;
      const motion = createMotion();
      const dual = number === 4;
      let renderer, state, lanes, step, stage;
      if (dual) {
        state = createState(level);
        const game = createDualBattlefield({ state, onEvent: (event, sim) => renderer.receive(event, sim) });
        renderer = createDualRenderer(state, canvas, game);
        game.reset();
        ({ lanes } = game.state);
        step = () => {
          state.gunX = dualAim("adaptive-imperfect", Math.floor(state.t + 1e-8), lanes, state.gates, game.state.phalanx);
          game.advance(dt);
        };
        stage = () => ({ wall: game.state.phalanx.phase, siege: game.state.siege.phase });
      } else {
        const game = createGame({ level, onEffect: motion.receive, random: () => 0.5 });
        game.reset();
        ({ state } = game);
        lanes = { main: state };
        renderer = createRenderer(state, canvas, motion);
        const aim = number === 1 ? createAim("C")
          : number === 2 ? purrapultAim("gates-first", level) : meowmenAim("balanced");
        step = () => {
          const front = state.front;
          state.gunX = aim(state);
          game.update(dt);
          motion.step(state.t + state.victoryElapsed, (state.front - front) / dt,
            state.blueTotal, state.redEntryOpen, level, state);
        };
        stage = () => ({});
      }
      renderer.resize();
      const stages = [];
      let peak = -1, peakTick = 0;
      window.scaleProfile = {
        step, state, lanes, stage, renderer, canvas, motion,
        checkpoints() {
          for (let tick = 0; tick < 14400 && state.mode === "playing"; tick++) {
            const blue = Object.values(lanes).reduce((total, lane) => total + lane.blueTotal, 0);
            const seen = new Set(stages.map(({ name }) => name));
            const add = name => { if (!seen.has(name)) stages.push({ name, tick }); };
            if (tick === 0) add("opening");
            if (!dual && state.squads.length) add("first-launch");
            if (blue > (dual ? 95 : 60)) add("first-reinforcement");
            if (blue >= 135) add("near-literal-limit");
            if (blue >= 160) add("transition");
            const upgrades = state.gates.filter(gate => gate.barricadeId && gate.mult && gate.open);
            if (upgrades.length) add("first-upgrade");
            if (tick === 1800) add("midgame");
            if (state.gates.at(-1).open) add("large-unlock");
            if (state.finalActivated || (dual && lanes.right.squads.some(s => s.multiplier === state.gates.at(-1).mult)))
              add("large-wave");
            if (stage().wall === "deploying") add("phalanx");
            if (stage().siege === "encirclement") add("encirclement");
            if (blue > peak) {
              peak = blue;
              peakTick = tick;
            }
            step();
          }
          stages.push({ name: "peak", tick: peakTick }, { name: "outcome", tick: Math.round(state.t * 60) });
          return stages;
        },
      };
    };
    await page.evaluate(setup, level);
    const checkpoints = await page.evaluate(() => window.scaleProfile.checkpoints());
    await page.reload();
    await page.evaluate(setup, level);
    report[level] = {};
    let tick = 0;
    for (const checkpoint of checkpoints.sort((a, b) => a.tick - b.tick)) {
      report[level][checkpoint.name] = await page.evaluate(async advance => {
        const { step, state, lanes, renderer, canvas, stage } = window.scaleProfile;
        for (let i = 0; i < advance; i++) step();
        const ctx = canvas.getContext("2d");
        const drawImage = ctx.drawImage;
        const cats = { blue: [], red: [] };
        const reserve = { blue: 0, red: 0 };
        const cssScale = canvas.getBoundingClientRect().width / 420;
        ctx.drawImage = function (...args) {
          const [, sx, sy, sw, sh, x, y, width, height] = args;
          if (this.globalAlpha > 0.2 && sw === 48 && sh === 32)
            reserve[sy < 96 ? "red" : "blue"] += sx / 48 + 1;
          if (this.globalAlpha > 0.2 && sw === 48 && sh === 48 && sy !== 240)
            cats[sy < 96 || sy === 288 ? "red" : "blue"].push([x, y, width, height]);
          return drawImage.apply(this, args);
        };
        renderer.draw();
        ctx.drawImage = drawImage;
        const represented = Object.fromEntries(Object.entries(cats).map(([side, sprites]) => {
          const xBins = new Set(), yBins = new Set();
          let area = 0, size = 0;
          for (const [x, y, width, height] of sprites) {
            xBins.add(Math.round((x + width / 2) / 10));
            yBins.add(Math.round((y + height / 2) / 8));
            area += width * height * cssScale ** 2;
            size += width * cssScale;
          }
          return [side, { sprites: sprites.length, reserve: reserve[side],
            occupiedColumnBins: xBins.size, occupiedRowBins: yBins.size,
            atlasWidthPx: sprites.length ? size / sprites.length : 0,
            atlasAreaPerViewport: area / (390 * 844) }];
        }));
        const frameMs = [], canvasMs = [];
        await new Promise(done => {
          let last;
          function frame(now) {
            const drawStart = performance.now();
            renderer.draw();
            if (last !== undefined) {
              frameMs.push(now - last);
              canvasMs.push(performance.now() - drawStart);
            }
            last = now;
            if (frameMs.length < 24) requestAnimationFrame(frame);
            else done();
          }
          requestAnimationFrame(frame);
        });
        function quantiles(values) {
          values.sort((a, b) => a - b);
          return [0.5, 0.95].map(q => +values[Math.floor(q * (values.length - 1))].toFixed(2));
        }
        const active = Object.fromEntries(Object.entries(lanes).map(([id, lane]) => [id,
          { blue: lane.blueTotal, red: lane.redTotal, front: lane.front }]));
        const memory = performance.memory?.usedJSHeapSize ?? null;
        return { time: state.t, mode: state.mode, ...stage(), active, represented,
          frameMs: quantiles(frameMs), canvasMs: quantiles(canvasMs), usedJSHeapSize: memory };
      }, checkpoint.tick - tick);
      tick = checkpoint.tick;
      if (output && ["opening", "first-reinforcement", "peak", "outcome", "phalanx", "encirclement"].includes(checkpoint.name))
        await page.screenshot({ path: join(output, `level-${level}-${checkpoint.name}.png`) });
    }
  }
  console.log(JSON.stringify({ browser: engine.name(), version: browser.version(), viewport, report }, null, 2));
} finally {
  await browser.close();
}
