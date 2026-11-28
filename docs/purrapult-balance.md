# The Purrapult simulation and balance

[Level 2 specification](levels/level-02.md) · [Level architecture](level-architecture.md)

## ×100 progression

On main at `14a3705`, sustained ×25 reached the enemy entrance in 32–50 s in the tested 60 Hz routes, with or without artillery. At 46 s, the old 3.42/s growth supplied about 171 reds/s out of its 288/s ceiling. A fully aimed cannon generates roughly 54, 268 or 1,071 blue cats/s at ×5, ×25 and ×100, respectively, before travel and casualties. The Purrapult removes up to 235 every 3.34 s (about 70/s at full coverage), with smaller hits against thin pockets.

At around 1,840 active blue cats, the melee model could already remove 171 reds/s. Blue also gains territorial pressure as its active formation grows, with diminishing returns from frontage. Once reds thinned out, new arrivals could be removed almost immediately. Blue took the entrance at y=100 and often cleared the remaining army on the same step. Time spent attacking the final barricade took shots away from reinforcements and was a net hindrance to an early ×25 win.

Level 2 keeps its starting army, 13.5/s initial red supply and 3.42/s growth for the first 20 s. Supply then grows continuously at 15.42/s up to 315/s, reached around 35.1 s with full entry access. While supply is open, melee red losses also respect the existing defender-based limit of 0.12 times the living red population per second. This lets a thin red line absorb reinforcements long enough for the ramp to matter, including against uninterrupted ×25 rushes. The limit drops away at cutoff. The ×100 barricade takes 105 hits (35 volleys, about 9.8 s of continuous fire) in place of 231 (77 volleys, about 21.6 s). This reduces the time away from ×25 while reds are building. The ×25 and artillery barricades take 90 and 36 hits respectively. Artillery cadence, targeting and damage use the same settings throughout the comparison.

### Parameter comparison

Run `node scripts/simulate-purrapult.js --sweep` for all outcomes across both 60 Hz schedules. The sweep counts 24 outcomes per candidate, including several aggressive plans that skip the starter gate.

| Supply and barricade candidate | Expected outcomes met |
| --- | --- |
| Original growth, ceiling raised to 315/s | 12 / 24 |
| Linear growth 4–5.5/s, ceiling 350/s | 11–12 / 24 |
| Linear growth 5.5/s, ceiling 325/s, 135-hit final wood | 17 / 24 |
| 20 s ramp with +9/s growth, ceiling 305–325/s, defender limit, 105-hit wood | 20–22 / 24 |
| 20 s ramp with +12–15/s growth, ceiling 305–325/s, defender limit, 105-hit wood | 24 / 24 for each pair |
| Chosen midpoint ceiling and +12/s ramp, with defender limit removed | 18 / 24 |
| Chosen supply and defender limit, with 231-hit final wood | 18 / 24 |

With the defender limit removed, all three direct ×25 rushes still win. With the old wood, all six ×100 runs lose. The selected 315/s ceiling and +12/s growth sit inside the successful range and leave time for defensive volleys while opening the final gate.

### Matched strategies

Run `node scripts/simulate-purrapult.js --compare` for matched outcomes at 30, 60 and 120 Hz, including five-second population and frontline samples, milestone times and both aim schedules. Schedule D starts later and uses different defensive intervals. All 72 retuned runs ended in a victory or castle breach. The table shows schedule C at 60 Hz. Times are battle seconds, V is victory and D is defeat. Higher y means closer to castle defeat at y=690.

| Strategy | Outcome and time | ×100 unlock | ×100 arrival | Furthest red y | Artillery losses | Supply cutoff | First melee with ×100 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Passive ×5 | D 50.9 → D 47.2 | — | — | 690.2 → 690.1 | 0 | — | — |
| Artillery rush | D 19.9 | — | — | 690.3 | 528 | — | — |
| Sustained ×25 | V 46.3 → D 80.0 | — | — | 401.5 → 690.2 | 0 | 46.3 → — | — |
| Direct ×25 rush | V 32.0 → D 102.2 | — | — | 475.0 → 690.2 | 0 | 32.0 → — | — |
| Rush artillery, then ×25 | V 36.1 → D 137.8 | — | — | 533.3 → 690.1 | 433 → 8490 | 36.1 → — | — |
| Rush ×25, then artillery | V 37.6 → D 134.4 | — | — | 542.5 → 690.2 | 356 → 8274 | 37.6 → — | — |
| Artillery first, stop at ×25 | V 46.8 → D 92.4 | — | — | 423.5 → 690.1 | 1149 → 5311 | 46.8 → — | — |
| Strong gate first, stop at ×25 | V 50.0 → D 86.1 | — | — | 401.5 → 690.2 | 755 → 3995 | 50.0 → — | — |
| Open ×100, keep using ×25 | D 114.5 → D 65.4 | 64.7 → 45.4 | — | 690.0 → 690.1 | 5848 → 2585 | — | — |
| Gates only through ×100 | V 108.8 → V 94.3 | 56.9 → 37.5 | 57.3 → 38.4 | 574.6 → 457.7 | 0 | 105.4 → 86.0 | 57.5 → 38.5 |
| Artillery first through ×100 | V 52.6 → V 90.7 | — → 43.4 | — → 44.0 | 423.5 → 487.2 | 1538 → 5076 | 52.6 → 85.4 | — → 44.2 |
| Strong gate first through ×100 | V 90.0 → V 97.5 | 64.7 → 45.4 | 66.2 → 45.9 | 401.5 → 505.3 | 4007 → 4700 | 89.9 → 92.3 | 66.4 → 46.1 |

In the early-artillery route, the Purrapult opens at 12.07 s, first hits at 13.17 s, and the ×25 gate opens at 22.98 s with reinforcements arriving at 24.12 s. With artillery and ×25 alone, the line moves from y=417 at 30 s back to y=388 at 45 s, then retreats to y=663 at 90 s as red grows from about 2,682 to 8,338 cats. In the ×100 route, the first arrivals at 43.98 s help build blue from about 1,306 at 45 s to 8,910 at 60 s. The line reverses near y=487 and reaches the entrance at 85.40 s. With the same aim schedule and inert artillery, red reaches y=634 and supply lasts until 129.35 s. The gates-only win demonstrates the artillery trade-off.

The harness records ×100 participation from a full melee window after the first cohort joins the active blue army. The simulation resolves melee for the whole formation. Supply cutoff and clearing remaining reds determine victory.

### Portrait evidence

`node scripts/capture-army-continuity.js test-results/purrapult http://127.0.0.1:4173 c-level-2` records a continuous 390 × 844 Chromium playthrough with the early-artillery schedule and touch input. The recorded battle lasted 97.45 s and ended after 26 artillery impacts. The timing JSON records the first hit, final wave arrival, cutoff and victory.

## Artillery model

The right-hand emplacement takes 36 direct cannon hits. Shots spent on wood do not produce blue soldiers, and switching aim preserves damage. After unlocking, the crew reloads in 2.4 seconds and fires when red troops are present. Only one yarn ball is in flight at a time, for 0.94 seconds. The next reload starts at impact.

At launch, the simulation locks a point near the front. At impact, it overlaps the fixed splash window with a band representing the current red concentration. A moving frontline can reduce the overlap or leave the shot without a target. Loss is bounded by splash overlap, a local share of the horde, the per-shot cap, and red troops still alive. The Canvas arc and scattering effects read the launch and impact states. Level 2 still requires blue pressure to secure the supply route. Once supply is cut off, a final artillery casualty can win, and changing or ending a battle discards any shot in flight.

## Historical balance results

The table compares Milestones 7 and 8 at 60 Hz, before the victory celebration. [Milestone 7 baseline](evidence/purrapult/strategies.json) · [Milestone 8 results](evidence/battlefield-impact/strategies.json)

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

## Milestone 13

Level 2 shares the engagement cap and increased red territorial weight.
Purrapult unlock, reload, flight, targeting and damage stay on their existing
simulation path. Actual impacts still create a visual gap. Nearby blue ranks
can press into the gap while the observed frontline is advancing.

At 60 Hz, artillery-first improves from 93.02 s and about 52,123 artillery
casualties to 91.70 s and about 50,860 artillery casualties. Gates-first
improves from 105.48 s to 100.05 s. Gates-only still wins and artillery-only
still loses. With the retuned melee model, the artillery-first policy can also
win with inert artillery. In that comparison, the live weapon wins about
27 s sooner and keeps the retreat over 238 battlefield units farther from the
castle. The live weapon resolves fewer impacts before victory than the inert run.
[Strategy results](evidence/combat-readability/strategy-results.json)
