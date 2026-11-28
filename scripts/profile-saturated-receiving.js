import { chromium, webkit } from "@playwright/test";

const engine = process.argv[2] === "webkit" ? webkit : chromium;
const viewport = { width: 390, height: 844 };
const browser = await engine.launch(engine === chromium ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const results = [];
  for (const population of [10000, 30000]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    try {
      await page.goto(process.env.SIEGE_URL ?? "http://127.0.0.1:4173");
      results.push(await page.evaluate(async population => {
        const [{ createGame }, { createMotion }, { createRenderer }] = await Promise.all([
          import("/src/game.js"), import("/src/motion.js"), import("/src/render.js"),
        ]);
        for (const id of ["menu", "hud", "battleNav"]) document.getElementById(id).style.display = "none";
        const motion = createMotion();
        const arrived = [];
        let losses = 0;
        const game = createGame({ random: () => 0.5, onEffect(kind, time, value, front, redLoss, blueLoss) {
          motion.receive(kind, time, value, front, redLoss, blueLoss);
          if (kind === "arrival") arrived.push({ value, time });
          if (kind === "clash") losses += blueLoss + redLoss;
        } });
        game.reset();
        const { state } = game;
        Object.assign(state, { t: 2, blueTotal: population, redTotal: 30000, front: 365, nextShot: 1000 });
        const tick = dt => {
          const front = state.front;
          game.update(dt);
          motion.step(state.t, (state.front - front) / dt,
            state.blueTotal, state.redEntryOpen, state.level, state);
        };
        motion.step(state.t, 0, state.blueTotal, state.redEntryOpen, state.level, state);
        const { target } = motion.contact.blueArmy;
        const roster = motion.contact.reinforcements;
        const seed = { x: 329, entryY: 565, mult: 100, phase: 1, born: 0 };
        roster.admit(seed, 144, target.field, target.reserve, target);
        for (const member of seed.members) member.settled = true;

        const canvas = document.querySelector("#game");
        const renderer = createRenderer(state, canvas, motion);
        renderer.resize();
        // Six volleys with staggered contacts, during real lane combat.
        const relay = state.level.relayGates[0];
        for (let volley = 0; volley < 6; volley++) {
          for (let slot = -1; slot <= 1; slot++) {
            state.squads.push({
              x: 329 + slot * 9, y: state.front + state.level.combat.arrivalOffset + 8 + volley * 17,
              phase: volley + slot + 1, marchTime: 1.0 + (5 - volley) * 0.11,
              entryY: 565, slot, volley, mult: 100, count: 500, relay: { y: relay.hitY, at: 0.8 },
              gates: [{ id: relay.after, multiplier: 100 }, { id: relay.id, multiplier: relay.mult }],
            });
          }
        }

        const ctx = canvas.getContext("2d");
        const original = ctx.drawImage;
        let blueSprites = 0, blueStamps = 0;
        ctx.drawImage = function (...args) {
          const [, , dy, width, height] = args;
          if (width === 48 && height === 48 && dy >= 96 && dy < 240) blueSprites++;
          if (width === 48 && height === 32 && dy >= 96) blueStamps++;
          return original.apply(this, args);
        };
        const tracked = new Set();
        const completed = new Map();
        const drawMs = [], frameMs = [];
        let lossesInSample = 0;
        let peakReceiving = 0, peakObjects = 0, peakIndividuals = 0, peakStamps = 0;
        let peakUnassigned = 0, peakAssigned = 0, peakTails = 0, peakTravelling = 0;
        await new Promise(resolve => {
          let frame = 0, previous;
          function sample(now) {
            tick(1 / 60);
            blueSprites = blueStamps = 0;
            const start = performance.now();
            renderer.draw();
            if (frame === 150) lossesInSample = losses;
            if (previous !== undefined && frame <= 150) {
              drawMs.push(performance.now() - start);
              frameMs.push(now - previous);
            }
            previous = now;
            peakIndividuals = Math.max(peakIndividuals, blueSprites);
            peakStamps = Math.max(peakStamps, blueStamps);
            peakTails = Math.max(peakTails, motion.tails.length);
            peakTravelling = Math.max(peakTravelling, state.squads.length * 48);
            const live = new Set();
            let receiving = 0, unassigned = 0, assigned = 0;
            for (const q of motion.tails) {
              tracked.add(q);
              for (const member of q.members ?? []) {
                live.add(member);
                assigned += Number(member.assigned && !member.retired);
                unassigned += Number(!member.assigned && !member.settled);
                receiving += Number(!member.assigned && !member.settled && member.receivingAt !== undefined);
              }
            }
            for (const member of roster.field) if (member) live.add(member);
            for (const member of roster.reserve) if (member) live.add(member);
            for (const q of tracked) {
              if (!completed.has(q) && q.members.every(m => m.settled)) completed.set(q, state.t - q.at);
            }
            peakObjects = Math.max(peakObjects, live.size + motion.tails.length);
            peakReceiving = Math.max(peakReceiving, receiving);
            peakUnassigned = Math.max(peakUnassigned, unassigned);
            peakAssigned = Math.max(peakAssigned, assigned);
            if (++frame <= 150 || (motion.tails.length && frame < 210)) requestAnimationFrame(sample);
            else resolve();
          }
          requestAnimationFrame(sample);
        });
        ctx.drawImage = original;
        function percentiles(values) {
          values.sort((a, b) => a - b);
          return [0.5, 0.95].map(p => +values[Math.floor(p * (values.length - 1))].toFixed(2));
        }
        let aggregated = 0, retired = 0;
        const aggregationSeconds = [], approachSeconds = [], compressionSeconds = [];
        for (const q of tracked) for (const member of q.members) {
          if (member.aggregatedAt !== undefined) {
            aggregated++;
            aggregationSeconds.push(member.aggregatedAt - q.at);
            approachSeconds.push(member.dockedAt - q.at);
            compressionSeconds.push(member.aggregatedAt - member.dockedAt);
          }
          retired += Number(!!member.retired);
        }
        const arrivalPopulation = arrived.reduce((sum, event) => sum + event.value.count, 0);
        if (arrivalPopulation !== 9000 || !(lossesInSample > 0)) throw new Error("Fixture missed its arrivals or combat");
        return {
          population, arrivals: arrivalPopulation, losses: lossesInSample,
          samples: drawMs.length, drawMs: percentiles(drawMs), frameMs: percentiles(frameMs),
          peakIndividuals, peakStamps, peakReceiving, peakUnassigned, peakAssigned, peakTravelling, peakObjects, peakTails,
          aggregated, retired, outstanding: motion.tails.length, completedCohorts: completed.size,
          lastCompletedSeconds: completed.size ? +Math.max(...completed.values()).toFixed(2) : null,
          approachSeconds: approachSeconds.length ? percentiles(approachSeconds) : null,
          compressionSeconds: compressionSeconds.length ? percentiles(compressionSeconds) : null,
          aggregationSeconds: aggregationSeconds.length ? percentiles(aggregationSeconds) : null,
          usedJSHeapSize: performance.memory?.usedJSHeapSize ?? null,
        };
      }, population));
    } finally {
      await page.close();
    }
  }
  console.log(JSON.stringify({ engine: engine.name(), version: browser.version(), viewport, dpr: 2, results }, null, 2));
} finally {
  await browser.close();
}
