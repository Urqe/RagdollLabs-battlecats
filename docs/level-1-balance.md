# Level 1 validation and balance

The three policies in `tests/helpers/strategies.js` only aim the cannon. The production simulation fires, collides, unlocks, marches, fights and ends the game. Simulations use fixed time steps and fixed cosmetic randomness. No strategy gets privileged damage, troops or outcome triggers.

## Findings and decisions

The previous baseline lost with ×20 at ~70 seconds, and won with unlocking at ~43 seconds. Marching strength incorrectly influenced the front before arrival, and the final gate changed combat rates as soon as a cat spawned. ×20's old strength threshold was too high to meaningfully slow the horde.

All balance parameters live in `src/config.js` (`LEVEL`, `workNeeded`, shot interval and blue speed):

- Keep three projectiles every 0.28 seconds, giving 60 / 297 / 2,997 soldiers per full volley. Blue marching speed remains 104 pixels/second, versus a maximum red advance of 5.8.
- Raise barricade durability from 54 / 126 to 108 / 270 direct projectile hits. Continuous aim takes about 10.1 / 25.3 seconds, including flight. Each blocked shot yields no soldiers. Gates have independent damage; only projectile collision calls the damage routine.
- Arrived blue troops above 20 reduce red advance to 2.1 pixels/second. ×20's ~214 soldiers/second cannot replace the 235/second combat loss. It slows defeat but cannot turn the tide. Above 1,200 combat troops, ×99 supplies a small defensive push (-0.4 pixels/second) and a reserve for time spent breaking wood.
- Marching troops contribute zero combat strength and cannot move the front. Every squad is drawn at the gate and marches for at least 0.25 seconds, even near a breached line.
- Only arrival of a ×999 squad activates the counterattack. Enemy reinforcements stop, damage scales with combat troops (0.8 per cat/second, capped at 3,200), and surviving blue strength above 850 pushes at 8 pixels/second. No automatic extra retreat is applied after enemy elimination.
- Victory requires both zero enemies and a blue-held frontline at or above y=30. The castle is breached at y=690. These are physical state conditions, with no victory clock.
- Visible wood and HUD use one progress calculation and identical integer percentages. A colored seam marks the frontline. Bounded representative formations and cached cat sprites keep enormous logical armies inexpensive to draw; the simulation retains every soldier's count.

## Reproducible outcomes

`npm run simulate` prints machine-readable results. [Committed results](evidence/strategies.json) include 30, 60 and 120 Hz runs. Representative 60 Hz outcomes:

| Strategy | Policy | Result | Duration | Furthest enemy front | ×99 / ×999 opens |
| --- | --- | --- | --- | --- | --- |
| A: passive | Aim exclusively at ×20 | Defeat | 112.92 s | 690.02 | Never |
| B: aggressive | Open ×99 immediately, reinforce for 4 seconds, spend all shots on ×999, then reinforce | Victory | 89.07 s | 417.41 | 10.12 / 39.52 s |
| C: balanced | Alternate ×20 / wood every 2 seconds; once ×99 opens, replenish whenever combat reserve falls below 1,800, otherwise attack ×999 wood | Victory | 99.10 s | 388.80 | 20.18 / 54.35 s |

Balanced play sacrifices speed for safety: it holds the enemy roughly 29 pixels farther from the castle. At all three update rates, an extreme 80-second delay before beginning unlocking causes aggressive play to lose while balanced play still wins. Those deliberately late recoveries take over 120 seconds and are robustness checks, not the normal duration target. Tests also cover ±20-pixel aim error and 0/5/10-second delays; both unlocking strategies win all nine cases, while passive defense always loses. These are bounded deterministic scenarios, not a claim about human win rates.

## Browser evidence

The complete touch playthrough starts with two seconds of ×20, breaks ×99 using native touch drags, reinforces for four seconds, opens ×999, verifies pushback and completes victory. It checks detached snapshots and the actual HUD/results, captures counterattack/victory screenshots and milestone JSON, and restarts through the result button. A second playthrough keeps ×20 selected until defeat and verifies both barricades remain undamaged. Every browser test collects uncaught JavaScript and console errors.

Playwright's clock drives real requestAnimationFrame callbacks at normal simulation speed with accelerated wall time; no state setters or test-only gameplay shortcuts exist. Chromium runs both full playthroughs; mobile WebKit separately checks startup and reinforcements. This tests the Safari engine, not physical iPhone hardware. CI uploads screenshots and milestone JSON even on successful runs, plus traces on failure.
