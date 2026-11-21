# Level 1 combat and balance

SiegeDolls uses one combat model from the first ×20 volley through the final advance. The cannon fires three cats every 0.28 seconds. Unobstructed volleys produce 60, 297, or 2,997 cats, depending on the gate. The left and right barricades take 90 and 231 direct hits, respectively. Damage persists across aim changes. Shots that hit wood yield no reinforcements.

## Combat model

- **Reinforcements.** Blue formations march from their gates at 104 battlefield pixels per second and join the blue reserve when they reach the frontline. The enemy starts with 2,225 cats. Its entry rate increases from 150 cats per second by 34.1 cats per second for each elapsed second, up to 3,200 per second. The rate falls as blue takes the last 50 pixels of the approach, and seals off at the clearing line. Gate unlocks and arrivals leave the recruitment formula unchanged.
- **Casualties.** Each arrived blue cat can remove 0.111 red cats per second, up to 4,400 red casualties per second across the narrow frontage. Red pressure inflicts blue casualties based on the horde's size and the number of blue cats exposed at the front, capped by the number of red cats in contact. Each side can lose at most the cats it has available in that update. Both rates use the same pre-casualty army counts.
- **Frontline.** After taking losses, each side's surviving strength determines movement. Red strength uses 0.04 per cat, reflecting lower effectiveness per soldier. At equal strength the line holds. The relative strength difference scales movement continuously, up to 21.1 pixels per second toward the castle or 13.7 toward the entry. Red advances more slowly than blue marching formations.
- **Outcomes.** The castle falls at y=690. Victory requires a surviving blue force to reach y=30 or farther and eliminate every remaining red cat. The first ×999 arrival announces reinforcements. Its contribution comes from the same pressure and casualty formulas as every other formation.

Balance values are in [`src/config.js`](../src/config.js). The simulation tracks aggregate combat strength and individual marching formations. The renderer uses the same troop counts for representative ranks, the entry rate for red files, and casualty losses for contact effects. Every multiplier has a distinct marching footprint. Square-root scaling and sprite limits keep the late-game armies readable, and terrain and cat sprites are cached. The visual entry files represent recruits already counted in the red army.

## Deterministic results

Run `npm run simulate` to reproduce [all 30, 60, and 120 Hz results](evidence/strategies.json). Each policy controls only cannon aim. Smaller frontline y values are closer to the enemy entry. Reversals are changes in the net direction of a roughly one-second sample with more than two pixels of movement.

| Strategy | Outcome at 30 / 60 / 120 Hz | Duration range | ×99 / ×999 unlock at 60 Hz | Furthest red advance at 60 Hz |
| --- | --- | --- | --- | --- |
| A · Stay on ×20 | Defeat / Defeat / Defeat | 48.90–49.07 s | — / — | y=690.24 |
| B · Open ×99 immediately, reinforce for four seconds, then stay on the final barricade | Defeat / Defeat / Defeat | 34.23–34.27 s | 8.43 / 34.18 s | y=690.08 |
| C · Balanced, longer reinforcement bursts | Victory / Victory / Victory | 98.57–98.95 s | 17.12 / 56.87 s | y=560.13 |
| D · Balanced, shorter reinforcement bursts | Victory / Victory / Victory | 101.33–101.65 s | 19.63 / 55.18 s | y=623.74 |
| Open ×99 with C, then stay on ×99 | Defeat / Defeat / Defeat | 100.73–101.06 s | 17.12 / — | y=690.25 |
| Aim at the final barricade from the start | Defeat / Defeat / Defeat | 16.82–16.83 s | — / — | y=690.18 |

At 60 Hz, ×20 drives the line back by more than 70 pixels from its starting position before stalling and retreating. Sustained ×99 fire pushes the line back to about y=105 before the growing horde reverses it. The two balanced schedules get their first ×999 troops to the front at 57.33 and 55.65 seconds. Both then drive the horde back by more than 500 pixels. Both tolerate the tested ±20-pixel aiming errors and small delays. The exact aim schedules are in [`tests/helpers/strategies.js`](../tests/helpers/strategies.js).

## Browser evidence

| Phase | Playwright capture |
| --- | --- |
| ×20 gains ground, then the horde grows | [Blue advance](evidence/phase-1-advance.png) · [Blue retreat](evidence/phase-1-retreat.png) |
| ×99 arrives and reverses the line | [Reversal](evidence/phase-2-reversal.png) |
| ×999 reaches the front and clears the approach | [Counterattack](evidence/phase-3-counterattack.png) · [Victory](evidence/victory.png) |

Chromium playthroughs use native touch drags. Mobile-emulated WebKit runs the playthroughs with browser mouse input. Playwright advances the actual animation loop and reads detached snapshots. CI retains the screenshots, milestone JSON, and failure traces. [Chromium milestone data](evidence/browser-playthrough.json)

The outcome timings describe controlled strategies. Playwright covers the browser engines and input paths above. Frame rates on physical phones and human win rates remain unmeasured.
