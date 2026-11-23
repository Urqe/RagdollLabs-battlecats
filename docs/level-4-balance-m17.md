# Level 4 balance · Milestone 17 release archive

Run `node scripts/simulate-dual.js` to replay the six aim strategies
against the public Level 4 definition. Aim changes happen on matching
one-second boundaries. Every reinforcement comes from an auto-fired
projectile, a gate collision, and a march to the frontline. The same
results are asserted at 30, 60, and 120 Hz render schedules.

| Strategy | Decision rule |
| --- | --- |
| West camping | Hold the west starter throughout. |
| East camping | Hold the east starter throughout. |
| Even alternation | Alternate starter gates every five seconds, starting west. |
| Threat-responsive | Aim at the starter on the crossing with the highest score. The score combines distance toward the castle and the pressure difference. |
| Upgrade-focused | Break west, then east, then fire through the upgraded gate on the higher-pressure crossing. |
| Mixed | Reinforce with starter gates while opening the outer gates in short windows. Use a starter for emergency defense before both upgrades open, then aim the stronger gates by pressure. |

## Release results

Combat duration excludes the outcome presentation. Paired times are west /
east, in seconds. Final populations are blue:red and exclude squads still
marching when combat freezes. Reinforcing time counts aim at open gates and
excludes time spent breaking wood. Dashes indicate an event that never
occurred.

| Strategy | Outcome | Combat | Final west · east | Unlock | Cut supply | Reinforcing |
| --- | --- | ---: | --- | --- | --- | --- |
| West camping | East breach | 22.7 | 2,632:0 · 2:1,558 | — / — | — / — | 22.7 / 0.0 |
| East camping | West breach | 24.7 | 1:1,640 · 2,819:0 | — / — | — / — | 0.0 / 24.7 |
| Even alternation | Win | 88.7 | 5,743:0 · 1,442:0 | — / — | 40.0 / 85.7 | 45.0 / 43.7 |
| Threat-responsive | Win | 49.0 | 3,085:0 · 1,957:0 | — / — | 48.5 / 49.0 | 28.0 / 21.0 |
| Upgrade-focused | Win | 93.8 | 8,118:0 · 7,307:0 | 6.2 / 13.2 | 86.2 / 86.3 | 41.7 / 39.7 |
| Mixed | Win | 78.4 | 6,842:0 · 5,361:0 | 17.3 / 29.2 | 73.4 / 73.2 | 37.1 / 28.7 |

With the same strategy decisions, 17B wins took 17.1–49.8 seconds and
camping losses took 9.9–17.9 seconds. The release opens with 225 blue cats
per crossing and 460 west / 490 east red cats. There is a similar recovery
window on either side. The final balance slows territorial movement and
caps red casualties at 97 per second per crossing. A late red supply rate
of up to 100 per second keeps a defending group on the field until the
entrance is approached, making cutoff and the final clear distinct.

The even and mixed strategies fall within the 60–100 second target. The
tuned threat-response strategy wins faster by shifting fire before the
frontline reaches danger. Opening both gates first puts the east crossing
into danger, but the upgraded gate supplies 180 cats in a clean volley and
can turn the retreat around. Opening those gates in windows while defending
is faster in this replay. Neither upgrade is required for the two starter
strategies that win.

In a recovery replay, holding west for the first eight seconds and then
using the threat-responsive starter strategy still won in 79.8 seconds.
Holding west for 12 seconds let east enter the warning band. The same
recovery strategy cleared the warning and won in 135.2 seconds, outside
the target duration for a clean win.
