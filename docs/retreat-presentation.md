# Multiplier-line defeat presentation

Levels 1–3 and 5 now show the frontline reaching the enemy-facing edge of the main gate footprint when the simulation declares defeat. The gate footprint begins at y = 557 in the current layouts. The authoritative defeat threshold remains y = 690. Level 4 uses its existing siege renderer.

## Coordinates and handoffs

The projection leaves the upper field unchanged through y = 370.8. Below that point it subtracts a quadratic fraction of the 133-unit difference between the gate footprint and the castle threshold. Its slope decreases from 1 to 1/6, so the line keeps moving throughout a retreat and retraces the same positions during recovery. The defeat draw clamps any fixed-tick overshoot to the footprint edge.

Both formations, their contact effects, and the artillery and archer targets share projected positions. A marching Pawtorian rank uses the same leading-rank offset on both sides of its handoff to combat. Gates, terrain, projectile launches and the cannon retain their screen positions. Danger warnings still use the simulation's retreat and casualty timing.

Blue representatives still leave the actual gate and move into the projected receiving ranks, even when the simulated receiving line is already below the gate. Existing representative slots and movement limits preserve that journey. A relay dims while the logical receiving line intercepts the wave before it reaches the relay. This can happen while the visible line still appears upfield of the relay.

## Matched checks

The baseline is `0483c40`. The comparison covers 47 strategies at each of 30, 60 and 120 Hz. For single battlefields, it hashes the non-particle state after every combat tick and the ordered combat effects. For the connected siege, it hashes the frontline-event states and uses the existing ordered-event digest. The before and after reports match byte for byte. The closest tested recovery won after reaching an authoritative y of 685.7.

```sh
node scripts/compare-defeat-simulation.js /path/to/baseline > before.json
node scripts/compare-defeat-simulation.js > after.json
cmp before.json after.json
npm test
npx playwright test tests/browser/retreat-presentation.spec.js tests/browser/archers.spec.js
```

A 390×844 Chromium Canvas probe with 650 blue cats, 4,200 reds and an engaged armored cohort issued 630 image draws per frame on both versions. At three sampled fronts, median synchronous draw time was 3.92–4.15 ms on main and 2.82–3.83 ms with the projection. This measures Canvas submission on the test host. Physical iPhone frame timing remains unverified.

Playwright can save matched portrait frames by setting `DEFEAT_RECORD_DIR`. Set `DEFEAT_BASE_URL` to a separately served baseline to run the same touch inputs and capture windows against it.
