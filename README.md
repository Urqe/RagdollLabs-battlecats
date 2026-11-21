# SiegeDolls 🐱⚔️

SiegeDolls is a small, ad-free, one-finger cat siege game with two playable levels.

**Play:** https://urqe.github.io/RagdollLabs-battlecats/

## Controls

- **Finger:** Slide across the battlefield to move the cannon sideways. No tap-to-fire.
- **Mouse:** Move horizontally over the battlefield.
- **Keyboard:** Arrow keys or A/D.
- The cannon automatically shoots **three tiny cats per volley**.
- Sound effects start muted. Use **Sound off** in the main menu or result screen to enable them.

## Choose a level

Open **Choose level** from the main menu to play **The Last Stand** or **The Purrapult** immediately. **Defend the Castle** launches your last selected level. Use **Levels** below the battlefield or **Choose level** on the result screen to switch. **Try Again** replays the current battle. Completion markers track wins and every implemented level is available from the start.

## Level 1

The red horde starts larger and recruits faster as the siege goes on. Switch between reinforcing the frontline and breaking barricades to unlock stronger multipliers:

1. **Middle ×20:** Open from the start. Every incoming cat through the gate becomes 20. Three shots become a marching squad of **60 blue cats**. Use it to gain early ground before the horde grows.
2. **Left ×99 barricade:** Aim your cannon directly at the wood barrier instead of producing reinforcements. Each hit damages it, and a progress indicator shows your work. Once broken, fire through the ×99 gate to reclaim ground before the horde surges again.
3. **Right ×999 barricade:** Takes more hits to break. Again you must personally aim at the wood, temporarily sacrificing reinforcements. Once open, send three cats through the gate to produce a **2,997-cat** counterattack per volley.

Cats do not instantly teleport to the front. Each gate creates a visible **marching formation** that moves toward the enemy; their army count is delivered when the formation reaches combat. Large squads render representative soldiers with their total still accounted for in the battle simulation.

**Victory** comes when your blue army cuts off the enemy supply route and eliminates the last invader. A short celebration shows blue taking the yard. **Defeat** comes when the red frontline reaches the castle.

## Level 2

Break the wood at the right-hand Purrapult emplacement while keeping your frontline reinforced. The crew automatically winds up and lobs yarn at the approaching horde. The catapult pushes back the pressure while volleys through the gates keep defenders at the line. [Level design and balance evidence](docs/purrapult-balance.md)

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

`npm run test:browser` runs startup and full playthroughs on mobile-sized Chromium and WebKit viewports. It starts its own local server. To use an installed Chromium, set `CHROMIUM_PATH=/path/to/chromium`. GitHub Actions runs both suites on pushes and pull requests and saves browser evidence.

## Code map

- `index.html` / `styles.css`: page structure and mobile-first layout.
- `src/main.js`: DOM, HUD, results, and one animation loop.
- `src/state.js`: fresh per-game state and restart defaults.
- `src/levels.js` / `src/config.js`: level registry, battlefield definitions, and Level 1 regression constants.
- `src/artillery.js` / `src/artillery-render.js`: simulation-owned catapult attacks and Canvas presentation.
- `src/progress.js`: local level selection and completion markers.
- `src/controls.js`: touch, mouse, and keyboard controls.
- `src/projectiles.js`: three-cat volleys, flight, and swept gate collisions.
- `src/barricades.js`: direct-hit damage and gate unlocking.
- `src/multipliers.js`: multiplied marching formations.
- `src/army.js`: marching, combat, frontline movement, and outcomes.
- `src/render.js`: Canvas layers, gates, cannon, and victory effects.
- `src/terrain.js` / `src/figures.js`: cached terrain, cat sprites, and representative formations.
- `src/motion.js` / `src/sound.js`: presentation timing, battle cues, and optional Web Audio effects.

For AI-assisted changes, keep simulation code independent of DOM and animation timing. Add a regression test for gameplay changes, run `npm run test:all`, and review mobile behavior. Preserve Level 1 as the regression baseline, including automatic three-cat volleys, manually destroyed barricades, and travel time before combat. Keep runtime dependencies lightweight.

## Level 1 balance validation

See the [combat model, tested outcomes, and gameplay recordings](docs/level-1-balance.md). Run `npm run simulate` for Level 1 or `node scripts/simulate-purrapult.js` for Level 2 at 30, 60, and 120 Hz. Chromium uses native touch drags in the playthrough tests. The browser diagnostics read a detached snapshot from `src/main.js`. CI retains the evidence in the `playwright-results` artifact.

## Roadmap and level design

Start with the [living roadmap and Level 1–10 specifications](docs/roadmap.md). See [level architecture](docs/level-architecture.md) for the incremental migration and the [playtest log](docs/playtest-log.md) for recording evidence and revising the plan.
