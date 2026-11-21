# SiegeDolls 🐱⚔️

**Level 1: The Last Stand** — a small, ad-free, one-finger cat siege game, playable in a mobile browser.

**Play:** https://urqe.github.io/RagdollLabs-battlecats/

## Controls

- **Finger:** Slide across the battlefield to move the cannon sideways. No tap-to-fire.
- **Mouse:** Move horizontally over the battlefield.
- **Keyboard:** Arrow keys or A/D.
- The cannon automatically shoots **three tiny cats per volley**.

## Level 1

The enemy horde is slower than your blue cats, but initially has an overwhelming numerical advantage. You must choose when to reinforce the front line and when to unlock the stronger multipliers:

1. **Middle ×20:** Open from the start. Every incoming cat through the gate becomes 20. Three shots become a marching squad of **60 blue cats**. This can delay the invasion, but cannot sustainably defeat it.
2. **Left ×99 barricade:** Aim your cannon directly at the wood barrier instead of producing reinforcements. Each hit damages it, and a progress indicator shows your work. Once broken, fire through the ×99 gate for a larger army.
3. **Right ×999 barricade:** Takes more hits to break. Again you must personally aim at the wood, temporarily sacrificing reinforcements. Once open, send three cats through the gate to produce a **2,997-cat** counterattack per volley.

Cats do not instantly teleport to the front. Each gate creates a visible **marching formation** that moves toward the enemy; their army count is delivered when the formation reaches combat. Large squads render representative soldiers with their total still accounted for in the battle simulation.

**Victory:** After firing through ×999, eliminate the red army and push the frontline beyond the top of the screen. **Defeat:** Allow the red horde to reach the castle. There is no arbitrary countdown.

## Local development

Requires Node.js 22 or newer. The production game has no dependencies or build step; serve the repository over HTTP (ES modules do not run from `file://`).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. Edit the files and refresh the browser. GitHub Pages can serve this repository directly.

## Tests

```sh
npx playwright install --with-deps chromium webkit
npm run test:all
```

`npm test` runs fast Node regression tests for startup/restart, scaled mouse and relative touch controls, automatic volleys, direct-hit barricades, all three multipliers, rendered marching formations, and victory/defeat. Tests create isolated state and advance simulated time without real timers.

`npm run test:browser` runs the Playwright mobile viewport smoke test: start from the menu, click the start button, wait for reinforcements, and check for JavaScript and console errors. It starts its own local server. To use an installed Chromium, set `CHROMIUM_PATH=/path/to/chromium`. GitHub Actions runs both suites on pushes and pull requests and saves browser failure artifacts.

## Code map

- `index.html` / `styles.css`: page structure and mobile-first layout.
- `src/main.js`: DOM, HUD, results, and one animation loop.
- `src/state.js`: fresh per-game state and restart defaults.
- `src/config.js`: original level geometry and tuning constants.
- `src/controls.js`: touch, mouse, and keyboard controls.
- `src/projectiles.js`: three-cat volleys, flight, and swept gate collisions.
- `src/barricades.js`: direct-hit damage and gate unlocking.
- `src/multipliers.js`: multiplied marching formations.
- `src/army.js`: marching, combat, frontline movement, and outcomes.
- `src/render.js`: Canvas drawing, formation aggregation, and resizing.

For AI-assisted changes, keep simulation code independent of DOM and animation timing. Add a regression test for gameplay changes, run `npm run test:all`, and review mobile behavior. Preserve the single level, original balance, three-cat automatic volleys, manually destroyed barricades, and travel time before combat. No runtime libraries, backend, monetization, or additional levels are needed.

## Level 1 balance validation

See [balancing decisions and tested outcomes](docs/level-1-balance.md) and run `npm run simulate` to reproduce the three strategies. The browser suite now includes native Chromium touch drags, complete victory and defeat playthroughs, restart, and a mobile WebKit startup smoke test. Playwright advances its clock through the real animation loop; it never grants damage or troops. `getSnapshot()` exported from `src/main.js` provides a detached, read-only copy for diagnostics. CI retains milestone JSON, counterattack/victory/defeat screenshots, and failure traces in the `playwright-results` artifact.
