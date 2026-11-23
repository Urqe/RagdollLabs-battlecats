# Level 4 balance · Milestone 18

[Level rules](levels/level-04.md) · [Milestone 17 symmetric release results](level-4-balance-m17.md)

Run `node scripts/simulate-dual.js` to replay all eight strategies through the normal cannon, barricades, projectile routing, march and lane combat. Aim decisions occur on one-second boundaries. Combat times exclude the outcome sequence. The unit suite compares complete results at render schedules of 30, 60 and 120 Hz.

| Strategy | Decision | Result | Combat (s) | West secured (s) | East cutoff (s) |
| --- | --- | --- | ---: | ---: | ---: |
| West camping | Hold west ×20 | East breach | 28.7 | — | — |
| East camping | Hold east ×20 | West breach | 21.9 | — | — |
| Even alternation | Switch ×20 every two seconds | West breach | 36.3 | — | — |
| West upgrade | Open west ×99 and alternate with east ×20 | West breach | 44.8 | — | — |
| East siege first | Open and camp east ×999 | West breach | 21.9 | — | — |
| Phalanx rush | Open the phalanx and leave the cannon there | East breach | 28.7 | 8.9 | — |
| Flank first | Defend both, open west ×99, release the phalanx, then invest east | Win | 109.3 | 21.4 | 108.4 |
| Mixed | Open east ×99 during western investment, reinforce both, then release the phalanx and push east | Win | 93.3 | 33.3 | 93.3 |

In the flank-first replay the west ×99 opens at 8.6 seconds, so clean volleys go from 60 to 297 recruits while the phalanx barricade is still closed. The west gate supplies the defense in short bursts while other volleys work on the barricade. The phalanx rush clears the west problem much sooner but leaves the east frontline falling. The east-first replay opens ×999 at 10.9 seconds and pressure on the exposed west still reaches the castle. Both wins open ×999, at 46.7 and 44.9 seconds respectively.

On the larger east approach, the fraction of maximum advance speed rises with the blue population up to 32,000. Three seconds after ×999 opens in the mixed replay, east blue grows from roughly 2,800 to 14,700. The matched replay that stays on east ×99 after securing west wins in 103.9 seconds, so the ×999 opening work saves 10.5 seconds in this approach.

## Why ordinary west defense eventually fails

The west bridge has frontage for the pressure equivalent of 850 ordinary blue cats. Blue reserves still march in and sustain the frontline through casualties. Red arrivals at the west approach rise by 15 per second each second, starting at 12 per second and capping at 800. The approach stays connected to the horde throughout the west frontline's reachable range. Ordinary contact can remove at most 68 reds per second. As arrivals build, the west line reverses toward the castle even with blue reserves behind it.

The balance regression gives the player an optimistic bound that ignores all cannon and march costs. It gives west maximum blue pressure and maximum red losses on every fixed tick. Under those assumptions west still breaches by **46.65 seconds**. The earliest east cutoff requires moving 230 logical units at the full maximum speed of 4.8 units per second, at least **47.92 seconds**, even with instant overwhelming reinforcements. The optimizer's fictional west defense is stronger than any legitimate aim strategy. An actual win requires the phalanx to finish locking its shields before the west breaches. The east gate availability and victory check depend on the local targets and combat state.

## Browser and portrait evidence

[390 × 844 battlefield screenshot after deployment](evidence/level-4-rework/phalanx-secured.png)

Run `npm run test:all` for the unit suite and the Chromium and WebKit projects. Level 4 tests exercise the normal selector and pointer input, pause during lock-in, restart, switching to Level 2, each breach reaction, exact upgrade routing, the survivor retreat and the command flag. The fixed-step suite also keeps the Level 1–3 outcome regressions.

With the local server and Playwright Chromium installed, run `node scripts/capture-level-4.js` to record the mixed playthrough at 390 × 844 and save a screenshot as the shield wall takes over. The script uses Chromium touch input and records frame intervals while capturing. The reference run finished combat in 93.25 seconds. Its 5,446 frame samples had a 16.7 ms median and a 33.3 ms 95th percentile while recording. Physical iPhone frame pacing and first-attempt comprehension remain open for playtesting.
