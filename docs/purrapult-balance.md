# The Purrapult simulation and balance

[Level 2 specification](levels/level-02.md) · [Level architecture](level-architecture.md)

## Artillery model

The right-hand emplacement takes 36 direct cannon hits. Shots spent on wood do not produce blue soldiers, and switching aim preserves damage. After unlocking, the crew reloads in 3.3 seconds and fires when red troops are present. Only one yarn ball is in flight at a time, for 0.94 seconds. The next reload starts at impact.

At launch, the simulation locks a point near the front. At impact, it overlaps the fixed splash window with a band representing the current red concentration. A moving frontline can reduce the overlap or leave the shot without a target. Loss is bounded by splash overlap, a local share of the horde, the per-shot cap, and red troops still alive. The Canvas arc and scattering effects read the launch and impact states. Level 2 still requires blue pressure to secure the supply route. Once supply is cut off, a final artillery casualty can win, and changing or ending a battle discards any shot in flight.

## Balance results

Run `node scripts/simulate-purrapult.js` to reproduce the [full 30, 60 and 120 Hz results](evidence/purrapult/strategies.json). Larger frontline coordinates are closer to the castle breach at y=690. Values below are from 60 Hz, with elapsed time measured before the victory celebration.

| Strategy | Result at all three rates | Duration | Furthest red advance | Catapult unlocked | Resolved yarn casualties |
| --- | --- | --- | --- | --- | --- |
| Passive ×20 | Defeat | 47.38 s | y=690.13 | — | 0 |
| Rush catapult and stay on it | Defeat | 16.83 s | y=690.18 | 3.38 s | 4,418 |
| Stronger gates only | Victory | 102.83 s | y=611.19 | — | 0 |
| Artillery first with defensive bursts | Victory | 94.90 s | y=505.36 | 12.07 s | 50,542 |
| ×99 before artillery, then ×999 | Victory | 105.82 s | y=617.76 | 29.98 s | 46,187 |

Early artillery buys time while the player moves between gates. When its damage is disabled in the regression test, the same early-artillery schedule loses at all three rates. The successful gate-only policy confirms a viable path that spends all useful shots on reinforcements and stronger gates. The later artillery unlock is a third viable route. The casualty totals include incoming red reinforcements throughout the battle.

## Browser evidence

Playwright captures the portrait viewport at 390 × 844. Chromium uses native touch events and mobile-emulated WebKit uses mouse input. [Browser milestone log](evidence/purrapult/browser-run.json)

- [Main menu](evidence/purrapult/01-menu.png) · [Level selector](evidence/purrapult/02-level-selection.png)
- [Locked catapult](evidence/purrapult/03-locked-catapult.png) · [Barricade destruction](evidence/purrapult/04-barricade-destruction.png)
- [Yarn in flight](evidence/purrapult/05-yarn-in-flight.png) · [Impact](evidence/purrapult/06-yarn-impact.png) · [Firing-cycle clip](evidence/purrapult/purrapult-cycle.mp4)
- [Artillery-assisted counterattack](evidence/purrapult/07-counterattack.png) · [Victory](evidence/purrapult/08-victory.png) · [Saved completion marker](evidence/purrapult/09-completion-marker.png)

The target band is an aggregate approximation. Human impressions of the artillery trade-off and physical iPhone performance remain unmeasured.
