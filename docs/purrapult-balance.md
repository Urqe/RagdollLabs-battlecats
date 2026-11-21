# The Purrapult simulation and balance

[Level 2 specification](levels/level-02.md) · [Level architecture](level-architecture.md)

## Artillery model

The right-hand emplacement takes 36 direct cannon hits. Shots spent on wood do not produce blue soldiers, and switching aim preserves damage. After unlocking, the crew reloads in 2.4 seconds and fires when red troops are present. Only one yarn ball is in flight at a time, for 0.94 seconds. The next reload starts at impact.

At launch, the simulation locks a point near the front. At impact, it overlaps the fixed splash window with a band representing the current red concentration. A moving frontline can reduce the overlap or leave the shot without a target. Loss is bounded by splash overlap, a local share of the horde, the per-shot cap, and red troops still alive. The Canvas arc and scattering effects read the launch and impact states. Level 2 still requires blue pressure to secure the supply route. Once supply is cut off, a final artillery casualty can win, and changing or ending a battle discards any shot in flight.

## Balance results

Run `node scripts/simulate-purrapult.js` to reproduce the 30, 60 and 120 Hz results. Higher frontline coordinates are closer to the castle breach at y=690. The table compares the preceding build with the current build at 60 Hz, before the victory celebration. [Milestone 7 baseline](evidence/purrapult/strategies.json) · [Milestone 8 results](evidence/battlefield-impact/strategies.json)

| Strategy | Result at all three rates | Battle seconds | Furthest red advance | Yarn impacts | Yarn casualties |
| --- | --- | --- | --- | --- | --- |
| Passive ×20 | Defeat | 47.38 → 47.38 | 690.13 → 690.13 | 0 → 0 | 0 → 0 |
| Rush catapult and stay on it | Defeat | 16.83 → 16.83 | 690.18 → 690.18 | 3 → 4 | 4,418 → 5,427 |
| Stronger gates only | Victory | 102.83 → 102.83 | 611.19 → 611.19 | 0 → 0 | 0 → 0 |
| Artillery first with defensive bursts | Victory | 94.90 → 93.02 | 505.36 → 474.06 | 19 → 24 | 50,542 → 52,123 |
| ×99 before artillery, then ×999 | Victory | 105.82 → 105.48 | 617.76 → 613.42 | 17 → 22 | 46,187 → 46,514 |

The reload fell from 3.3 to 2.4 seconds and the per-shot damage cap from 2,850 to 2,250. Flight still takes 0.94 seconds. The 60 Hz first hit arrives 0.9 seconds earlier for each artillery route. The early support route saw about 26% more impacts with 3.1% more cumulative artillery damage. The gate-only policy and the time to lose when rushing artillery stayed identical. The regression test runs the same early-artillery schedule with damage disabled, and it loses at all three rates.

Six shorter reload and lower damage pairs kept the intended strategy outcomes. At 2.0 seconds with a 2,050 cap, the early route limited red to y=446 and at 2.25 seconds with a 2,150 cap it limited red to y=467. The chosen pair limits it to y=474. At 2.45 seconds with a 2,200 cap, the rush still got only three impacts. The 2.4-second choice shows the faster cadence in both the rush and the assisted runs while preserving the castle breach on the unattended route.

## Impact presentation

A resolved hit provides its time, target coordinates, and casualty count to the motion layer. A bounded dust ring and up to 13 cached sprites show the impact. Their short ballistic arcs use a varied launch direction and a brighter version of the regular red cat sprite with flailing paws. A miss produces no hit animation. One local ellipse bends existing red ranks apart for about 1.24 seconds. The opening contracts as survivors march back through it. Each frame's formation count still follows the actual remaining population.

The shared animation uses position and momentum from the battle to vary lunges, recoil, front-rank compression, and the response to a reversal. Stronger-gate releases fan out into staggered ranks with the existing per-projectile sprite cap. Wood flashes and recoil come from direct hits. The gate unlock and the catapult crew have separate optional sound cues.

## Browser evidence

The Milestone 10 recording follows an entire artillery-assisted win with the HUD hidden. It shows repeated impacts, survivors refilling openings, and the final blue advance. [Continuous battle recordings](army-visual-scale.md#continuous-mobile-recordings)

The current recordings use muted Chromium at 390 × 844 with native touch input and the HUD hidden. Clip B cuts from the initial hold to the sustained retreat and reversal. Clip C cuts among the three gate outputs and speeds up the middle of the counterattack to 2.2×. The impact, refill, and final casualties play in real time.

- [A · Purrapult loading, flight, impact, and formation refill](evidence/battlefield-impact/a-purrapult-impact.mp4)
- [B · Frontline hold, retreat, and reversal](evidence/battlefield-impact/b-frontline-reversal.mp4)
- [C · Multipliers and the final counterattack](evidence/battlefield-impact/c-multiplication-counterattack.mp4)

Run `npm run dev`, then `node scripts/capture-motion.js test-results/m8-front` for the Level 1 footage and `node scripts/capture-motion.js test-results/m8-impact --purrapult` for Level 2. These commands require Playwright Chromium and FFmpeg. Each run saves the browser WebM, edited cuts, and timing marks.

The following 390 × 844 captures document the Milestone 7 baseline. Chromium uses native touch events and mobile-emulated WebKit uses mouse input. [Browser milestone log](evidence/purrapult/browser-run.json)

- [Main menu](evidence/purrapult/01-menu.png) · [Level selector](evidence/purrapult/02-level-selection.png)
- [Locked catapult](evidence/purrapult/03-locked-catapult.png) · [Barricade destruction](evidence/purrapult/04-barricade-destruction.png)
- [Yarn in flight](evidence/purrapult/05-yarn-in-flight.png) · [Impact](evidence/purrapult/06-yarn-impact.png) · [Firing-cycle clip](evidence/purrapult/purrapult-cycle.mp4)
- [Artillery-assisted counterattack](evidence/purrapult/07-counterattack.png) · [Victory](evidence/purrapult/08-victory.png) · [Saved completion marker](evidence/purrapult/09-completion-marker.png)

The target band is an aggregate approximation. A headless Chromium stress sample at 390 × 844 and 2× device pixel ratio exercised ×999 and artillery together. On the shared runner, the updated build submitted draws in about 3 ms median and 13 ms at the 95th percentile, while requestAnimationFrame intervals were irregular. The test used simulated battle setup and concurrent load, so it does not establish a sustained frame rate. Terrain, the sprite atlas, release limits, and bounded impact geometry keep the rendering cost independent of total logical troop count. Human impressions and physical iPhone performance remain unmeasured.
