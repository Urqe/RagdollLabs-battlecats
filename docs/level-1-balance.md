# Level 1 combat and balance

SiegeDolls uses one combat model from the first ×20 volley through the final advance. The cannon fires three cats every 0.28 seconds. Unobstructed volleys produce 60, 297, or 2,997 cats, depending on the gate. The left and right barricades take 90 and 231 direct hits, respectively. Damage persists across aim changes. Shots that hit wood yield no reinforcements.

## Combat model

- **Reinforcements.** Blue formations march from their gates at 104 battlefield pixels per second and join the blue reserve when they reach the frontline. The enemy starts with 2,225 cats. Its entry rate increases from 150 cats per second by 34.1 cats per second for each elapsed second, up to 3,200 per second. The rate tapers over the three pixels before the supply entrance at y=100. When blue takes the entrance, the banners change sides and red recruitment stops for the rest of the battle. Gate unlocks and arrivals leave the recruitment formula unchanged.
- **Casualties.** Each arrived blue cat can remove 0.111 red cats per second, up to 4,400 red casualties per second across the narrow frontage. Red pressure inflicts blue casualties based on the horde's size and the number of blue cats exposed at the front, capped by the number of red cats in contact. Each side can lose at most the cats it has available in that update. Both rates use the same pre-casualty army counts.
- **Frontline.** After taking losses, each side's surviving strength determines movement. Red strength uses 0.04 per cat, reflecting lower effectiveness per soldier. At equal strength the line holds. The relative strength difference scales movement continuously, up to 21.1 pixels per second toward the castle or 13.7 toward the entry. Red advances more slowly than blue marching formations.
- **Outcomes.** The castle falls at y=690. After the supply entrance is secured, the last casualty ends active combat immediately. A 1.5-second blue surge and flag-raising advance only the presentation clock, then the result appears. The first ×999 arrival announces reinforcements. Its contribution comes from the same pressure and casualty formulas as every other formation.

Balance values are in [`src/config.js`](../src/config.js). The simulation tracks aggregate combat strength and individual marching formations.

## Deterministic results

Run `npm run simulate` to reproduce [all 30, 60, and 120 Hz results](evidence/strategies.json). Each policy controls only cannon aim. Smaller frontline y values are closer to the enemy entry. Reversals are changes in the net direction of a roughly one-second sample with more than two pixels of movement.

| Strategy | Outcome at 30 / 60 / 120 Hz | Duration range | ×99 / ×999 unlock at 60 Hz | Furthest red advance at 60 Hz |
| --- | --- | --- | --- | --- |
| A · Stay on ×20 | Defeat / Defeat / Defeat | 48.90–49.07 s | — / — | y=690.24 |
| B · Open ×99 immediately, reinforce for four seconds, then stay on the final barricade | Defeat / Defeat / Defeat | 34.23–34.27 s | 8.43 / 34.18 s | y=690.08 |
| C · Balanced, longer reinforcement bursts | Victory / Victory / Victory | 95.70–96.27 s | 17.12 / 56.87 s | y=560.13 |
| D · Balanced, shorter reinforcement bursts | Victory / Victory / Victory | 96.63–96.90 s | 19.63 / 55.18 s | y=623.74 |
| Open ×99 with C, then stay on ×99 | Defeat / Defeat / Defeat | 100.73–101.06 s | 17.12 / — | y=690.25 |
| Aim at the final barricade from the start | Defeat / Defeat / Defeat | 16.82–16.83 s | — / — | y=690.18 |

At 60 Hz, ×20 drives the line back by more than 70 pixels from its starting position before stalling and retreating. Sustained ×99 fire pushes the line back to about y=105 before the growing horde reverses it. The two balanced schedules get their first ×999 troops to the front at 57.33 and 55.65 seconds. They secure the supply entrance at 93.82 and 96.53 seconds, respectively, then finish the remaining horde. All tested policies produce the same wins and losses as Milestone 3. The two wins finish earlier because combat ends on elimination. Both tolerate the tested ±20-pixel aiming errors and small delays. The exact aim schedules are in [`tests/helpers/strategies.js`](../tests/helpers/strategies.js).

## Battlefield rendering

- The wide limestone yard holds the red reserve. Its population grows with the logical red count and thins as red cats die. A narrower band of moving cats connects that reserve to the front. The red entry files represent recruits already counted in the simulation, and their visibility follows the current recruitment rate.
- Projectile drawings carry through the gate crossing. Each shot's expanding formation begins at its actual collision position and settles onto its logical marching path. Displayed wave sizes differ by multiplier while the simulation uses exact troop counts. The pillars, gate plates, barricade damage, debris and fire recoil follow the same gate and shot state.
- At contact, animated front ranks overlap, recoil in response to losses, and thin as both sides take casualties. During the victory animation, the blue ranks surge into the cleared yard while the gameplay clock, frontline, and troop counts stay fixed.
- The renderer caches terrain at the canvas resolution and keeps four stride poses plus one distant pose per cat tint in a single atlas. Near cats get paws, faces, and faster stride detail. Distant sprites use simplified shapes. Representative counts bound the busiest frames to roughly 2,800 soldier sprite draws, including marching waves. The renderer caps canvas pixel density at 2.

## Browser evidence

| Phase | Playwright capture |
| --- | --- |
| ×20 holds the crossing against the red reserve | [Early defense](evidence/phase-1-advance.png) |
| Red reinforcements build across the yard | [Growing pressure](evidence/phase-1-retreat.png) |
| ×99 reverses the line | [×99 counterattack](evidence/phase-2-reversal.png) |
| The horde regains ground | [Renewed pressure](evidence/phase-2-pressure.png) |
| ×999 creates a mass wave | [Multiplication](evidence/phase-3-multiplication.png) |
| Blue pushes the horde back | [Final advance](evidence/phase-3-counterattack.png) |
| The last red falls and blue raises its flag | [Cleared battlefield](evidence/phase-3-cleared.png) · [Victory result](evidence/victory.png) |

Chromium uses native touch drags. Mobile-emulated WebKit plays through the same scenarios with browser mouse input. Both use a 390 × 844 viewport. Playwright advances the actual animation loop and reads detached snapshots. CI retains screenshots, milestone JSON, and failure traces. [Chromium milestone data](evidence/browser-playthrough.json)

The strategy timings describe controlled runs. Physical iPhone frame rates and human win rates remain unmeasured.
