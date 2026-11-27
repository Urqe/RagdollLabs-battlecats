import { chromium, webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const engine = process.argv[2] === "webkit" ? webkit : chromium;
const output = process.argv[3];
const viewport = { width: 390, height: 844 };
const browser = await engine.launch(engine === chromium ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(process.env.SIEGE_URL ?? "http://127.0.0.1:4173");
  await page.evaluate(async () => {
    const [{ createRenderer }, { createState }, { createMotion }, { armyScale }] = await Promise.all([
      import("/src/render.js"), import("/src/state.js"), import("/src/motion.js"), import("/src/army-visual.js"),
    ]);
    for (const id of ["menu", "hud", "battleNav"]) document.getElementById(id).style.display = "none";
    const canvas = document.querySelector("#game");
    const state = createState();
    state.mode = "playing";
    const renderer = createRenderer(state, canvas, createMotion());
    renderer.resize();
    window.oceanProbe = { state, canvas, renderer, armyScale };
  });
  if (output) await mkdir(output, { recursive: true });
  const results = [];
  for (const population of [30, 100, 300, 1000, 3000, 10000, 30000, 100000, 300000]) {
    results.push(await page.evaluate(async population => {
      const { state, canvas, renderer, armyScale } = window.oceanProbe;
      Object.assign(state, { redTotal: population, blueTotal: population });
      const ctx = canvas.getContext("2d");
      const original = ctx.drawImage;
      const sides = [{ sprites: 0, silhouettes: 0, left: Infinity, right: -Infinity,
        top: Infinity, bottom: -Infinity, occupied: new Set() }];
      sides.push({ ...sides[0], occupied: new Set() });
      ctx.drawImage = function (...args) {
        const [, sx, sy, sw, sh, x, y, w, h] = args;
        if (sw === 48 && (sh === 32 || sh === 48) && sy !== 240) {
          const side = sides[Number(sh === 32 ? sy >= 96 : sy >= 96 && sy < 240)];
          side.sprites += Number(sh === 48);
          side.silhouettes += sh === 32 ? sx / 48 + 1 : 0;
          side.left = Math.min(side.left, x);
          side.right = Math.max(side.right, x + w);
          side.top = Math.min(side.top, y);
          side.bottom = Math.max(side.bottom, y + h);
          for (let row = Math.ceil(y / 8); row <= (y + h) / 8; row++)
            for (let col = Math.ceil(x / 8); col <= (x + w) / 8; col++) side.occupied.add(row * 64 + col);
        }
        return original.apply(this, args);
      };
      renderer.draw();
      ctx.drawImage = original;
      const canvasMs = [], frameMs = [];
      await new Promise(resolve => {
        let last, request;
        const timeout = setTimeout(() => { cancelAnimationFrame(request); resolve(); }, 2300);
        function frame(now) {
          const before = performance.now();
          renderer.draw();
          if (last !== undefined) {
            canvasMs.push(performance.now() - before);
            frameMs.push(now - last);
          }
          last = now;
          if (frameMs.length < 18) request = requestAnimationFrame(frame);
          else { clearTimeout(timeout); resolve(); }
        }
        request = requestAnimationFrame(frame);
      });
      const quantiles = values => {
        values.sort((a, b) => a - b);
        return [0.5, 0.95].map(p => values.length ? +values[Math.floor(p * (values.length - 1))].toFixed(2) : null);
      };
      const scale = canvas.getBoundingClientRect().width / 420;
      return { population, budget: armyScale(population), samples: frameMs.length,
        canvasMs: quantiles(canvasMs), frameMs: quantiles(frameMs),
        usedJSHeapSize: performance.memory?.usedJSHeapSize ?? null,
        sides: sides.map(({ sprites, silhouettes, left, right, top, bottom, occupied }) => ({
          sprites, silhouettes, widthPx: (right - left) * scale, depthPx: (bottom - top) * scale,
          occupiedPx: occupied.size * (8 * scale) ** 2,
          density: occupied.size * 64 / ((right - left) * (bottom - top)),
        })),
      };
    }, population));
    if (output) await page.screenshot({ path: join(output, `${population}.png`), scale: "css" });
  }
  console.log(JSON.stringify({ engine: engine.name(), version: browser.version(), viewport, results }, null, 2));
} finally {
  await browser.close();
}
