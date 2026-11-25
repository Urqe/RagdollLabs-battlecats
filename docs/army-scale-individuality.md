# Milestone 23 — Army scale and individuality

Milestone 22 started Levels 1–3 with an empty blue front and 2,225 red cats. At 390 × 844, the opening red formation drew 231 individual sprites and 232 reserve silhouettes for about 21% representation. The HUD began counting the first 60 blue cats as soon as they entered the march, while the front was still empty. The first arriving files quickly took the active blue force past the old 100-cat literal range. Widening or spreading those ranks can improve legibility, but it cannot show 2,225 opening defenders or 2,997 new cats per volley in this corridor.

Milestone 23 opens the same corridor with 34 blue and 78 red cats. Both appear in ordinary ranks. Fifteen recruits from a full starter volley leave the gate in three files of five, travel toward the rear shoulder, and start contributing when the march completes.

| Rule | Milestone 22 | Milestone 23 |
| --- | ---: | ---: |
| Levels 1–3 opening blue / red | 0 / 2,225 | 34 / 78 |
| West opening blue / red | 300 / 570 | 38 / 81 |
| East opening blue / red | 615 / 660 | 48 / 92 |
| Gate multipliers | ×20 / ×99 / ×999 | ×5 / ×25 / ×100 |
| Full three-shot volley | 60 / 297 / 2,997 | 15 / 75 / 300 |
| Red intake at start, Levels 1–3 | 150/s | 13.5/s |
| Red intake growth, Levels 1 / 2 / 3 | 34.1 / 38 / 55 | 3.069 / 3.42 / 3.861 |
| Red intake cap, Levels 1–3 | 3,200/s | 288/s |
| Red intake cap, west / east | 800 / 290 | 128 / 48 |
| Frontage, main / west / east | 80,000 / 450 / 6,000 | 2,400 / 72 / 960 |
| Melee red casualty cap/s, main / west / east | 4,400 / 83 / 235 | 343.2 / 13.28 / 48 |
| Melee blue casualty cap/s, main / west / east | 24,000 / 340 / 900 | 1,872 / 54.4 / 144 |
| Purrapult damage limit / pocket floor | 3,400 / 550 | 235 / 38 |
| Meowmen maximum damage per volley | 150 | 6 |
| Level 4 wall / west / east / siege barricade hits | 132 / 30 / 30 / 90 | 132 / 30 / 30 / 51 |
| Level 4 wall deployment pressure / red queue capacity | 380 / 1,700 | 60.8 / 272 |
| Full individual range, corridor / normal crossing | 100 / 100 | 150 / 112 |

## Experiments and strategy

We reused cannon policies and recorded fixed-step outcomes on all four levels. The aggressive candidate used ×3/×10/×50, 22 blue and 48 red in the corridor, and started the crossings at 22/42 west and 28/54 east. The moderate candidate used the selected corridor populations and gates. The original renderer was used for the comparison of population configurations. The selected build then applies the wider individual range and raises east intake and casualty capacity relative to the moderate candidate. The west remains narrower and accumulates opposition if the player delays the wall.

| Matched policy | Baseline time / peak blue | Moderate time / peak blue | Aggressive time / peak blue | Selected time / peak blue |
| --- | ---: | ---: | ---: | ---: |
| 1 · Balanced C | Win 87.75 s / 122,525 | Win 93.60 s / 24,337 | Win 29.45 s / 735 | Win 93.60 s / 24,337 |
| 2 · Artillery first | Win 80.78 s / 90,969 | Win 52.63 s / 2,039 | Win 26.57 s / 222 | Win 52.63 s / 2,039 |
| 3 · Balanced | Win 84.65 s / 131,340 | Win 95.73 s / 29,692 | Win 31.90 s / 533 | Win 95.73 s / 29,692 |
| 4 · Adaptive with missed shots | Win 103.23 s / 115,649 east | Win 67.73 s / 1,901 east | Win 69.27 s / 662 east | Win about 70 s / about 2,000 east |

- **The Last Stand.** Starter camping still loses. The aggressive candidate allows it to win in 22.62 s. Sustained ×25 can now win if used early enough. Diverting shots toward ×100 can expose the line, and the balanced C policy uses the arriving ×100 wave to reverse a late retreat. In that replay the first and last barricades open at 17.12 and 56.87 s. Supply closes at 92.25 s. Blue and red melee losses average about 169 and 153 per second, down from 2,055 and 1,475.
- **The Purrapult.** The area pocket still limits casualties on first contact, and its flight and reload remain the same. The impact animation uses force relative to the weapon's damage budget. Artillery first clears the route with one gate upgrade and about 1,538 artillery casualties. Gates first can win with both upgrades. Shooting the crew barricade and ignoring the infantry still loses.
- **The Meowmen.** The six-arrow cadence is unchanged. Each arrow can remove one cat. Early archer support and sustained ×25 can win before the final upgrade, while balanced investment can still build to ×100. Support alone loses.
- **A Tale of Two Tails.** West and east have independent intake, pressure and losses. The wall still locks on its authoritative deployment tick and sends surviving infantry east. Camping either crossing loses. Balanced policies can win with or without the optional siege gate. Skipping the east ×25 leaves a much longer fight, even if the player eventually opens ×100. With no wall the east can make progress, but it cannot begin the final encirclement. The wall, withdrawal, transfer, cutoff, flank and rout are checked in order and by population ownership.

The balanced Level 1 replay increases mean representation from 26% to 47% on blue and from 6% to 45% on red. The same policy has roughly 14 seconds of fully individual blue formations and 5 seconds on red, up from no whole-second samples in either range. The moderate candidate with the old renderer gives about eight and two seconds respectively. These are active-formation estimates sampled once per simulated second, with transit excluded. Failed or empty fronts do not count as seconds of one-to-one representation.

## Presentation

An ordinary field slot corresponds to one position in a center-out rank. Front ranks, shoulders and rear slots have deterministic coordinates and individual stride phases. Growth follows that slot order and opens the spacing gradually. Losses contract the occupied edge, while an event-backed fall and local refill impulse show the loss at contact. Purrapult and arrow reactions reuse the airborne pool. Returning cats substitute for their living slots during knockback.

Through 150 cats in the corridor or 112 per normal crossing formation, the occupied field budget is the rounded-up active count. A partially depleted final cat occupies a slot while its remaining population is positive. Above the local threshold, front ranks continue to add slots toward the cap and the rear grows with cached silhouettes. No field slots are reassigned when the reserve starts. The main corridor allows up to 252 close slots and 720 reserve silhouettes per team. At the crossings, ordinary fields use a 144-slot ceiling and a 588-silhouette reserve ceiling. The contact around the ridge and the rear attack have smaller budgets to fit the terrain.

The camera, seam, flight and handoff affect the number of complete atlas draws on any instant. A reserve tile paints up to six silhouettes. Starter files are individual. Medium files keep up to 20 travelling cats per projectile. The largest wave uses a dense column, and older overlapping corridor files use grouped stamps to keep the newest files and the line readable. The HUD includes marching and transferring troops. Only those that have arrived participate in pressure and losses. The same aggregate fixed-step combat model drives all levels.

## 390 × 844 evidence

| Milestone 22 opening | Milestone 23 opening |
| --- | --- |
| ![Milestone 22 Level 1 opening](evidence/army-scale-individuality/baseline-opening.png) | ![Milestone 23 Level 1 opening](evidence/army-scale-individuality/selected-opening.png) |

| First reinforcement | Victory advance |
| --- | --- |
| ![The first starter files reach the blue formation](evidence/army-scale-individuality/selected-reinforcement.png) | ![Blue horde fills the corridor in the victory advance](evidence/army-scale-individuality/selected-victory.png) |

The recordings use public level selection and cannon drag controls. The early HUD in both opening screenshots includes the first volleys already on the way. The selected victory still shows in-transit cats in the HUD. The clips and timing JSON are kept outside Git.

## Reproduction

From a checkout at this milestone, run the commands below. Keep the unchanged baseline in a separate worktree.

```sh
git worktree add --detach /tmp/siegedolls-m22 4039549
npm ci
node scripts/compare-army-scales.js 60 baseline /tmp/siegedolls-m22
node scripts/compare-army-scales.js 60 moderate /tmp/siegedolls-m22
node scripts/compare-army-scales.js 60 aggressive /tmp/siegedolls-m22
node scripts/compare-army-scales.js 60
npm test
npm run test:browser
```

Run `npm run dev` in a second terminal. Use `node scripts/capture-arcade-combat.js test-results/individuality a d f` to record Level 1, Level 4 and the support clips. Use `node scripts/profile-army-individuality.js chromium test-results/individuality-stills` and substitute `webkit` for the second engine. Set `SIEGE_URL` to point the profiler at another checkout. It samples 24 steady draws per reached checkpoint at device pixel ratio 2, with the replay frozen for each sample to keep the workload comparable. The timings measure Canvas draw submission and animation callback intervals. Atlas bounds include transparent margins. Counts include visible marching and reacting cats, and the support crew. Density estimates sum atlas bounds and therefore include overlaps. A physical iPhone Safari playtest is still the product-performance gate.
