# Level 5 balance · The Pawtorians

[Level specification](levels/level-05.md)

## Parameters

| System | Tuning |
| --- | --- |
| Pawtorian approach | One 1,500-cat cohort enters at 20 s at canvas y = 33 and marches 27 units/s. It joins red combat 9 units before the frontline. |
| Pawtorian effectiveness | 2.7× ordinary effectiveness. The share of engaged red troops that is armored scales red pressure and blue melee loss, subject to the shared casualty cap. |
| Melee resistance | The existing blue melee budget is allocated by each red population's share. Armor takes 42% of its portion. |
| Artillery | Nine full volleys unlock the Purrapult. The shared splash window, 235-cat hit cap, 2.4 s reload, and 0.94 s flight apply. Armor in the engaged pool carries twice the exposure weight and takes full allocated splash damage. Any unused allocation can spill into the other population within the hit budget. |
| Blue gates | ×5 starts open. ×25 and ×100 need 90 and 123 hits respectively. ×100 feeds the ×5 relay at y = 523 when the frontline leaves enough room to cross it. |
| Ordinary supply | Starts at 13.5/s and grows by 3.42/s each second. From 28 s it grows by an additional 9/s each second, capped at 395/s. |
| Level-specific combat | 660/s red melee loss ceiling, with a 0.16 per-defender rate limit while supply is open. Blue base advance is 20 canvas units/s. |

Moving armor is outside the engaged pool until contact and can neither inflict losses nor take melee or Purrapult damage while marching. Cutting supply prevents a future spawn. A regiment that already entered still has to be cleared. The game uses the same fixed 60 Hz combat ticks at each tested display rate.

## Strategy results

The harness samples the frontline and populations every two seconds and on armored spawn and contact, and records casualties by source, first arrivals for each reinforcement size, gate unlocks, first Purrapult hit, and supply cutoff. The table reports gameplay time before the victory animation. Schedule B spends 0.30 s more on ×25 per four-second final-gate work cycle.

| Aim strategy | Schedule A | Schedule B | Armored arrival A | Supply cutoff A |
| --- | --- | --- | --- | --- |
| Passive ×5 | Defeat 47.32 s | Defeat 47.32 s | 34.22 s | — |
| Hold ×25 | Defeat 60.33 s | Defeat 60.33 s | 30.67 s | — |
| ×25 and Purrapult | Defeat 65.90 s | Defeat 65.90 s | 31.20 s | — |
| Progress to final gate | Victory 93.78 s | Victory 112.92 s | 32.07 s | 89.40 s |
| Progress with Purrapult | Victory 80.43 s | Victory 87.67 s | 32.23 s | 77.23 s |
| Start final-gate work at 42 s | Defeat 56.58 s | Defeat 56.98 s | 30.67 s | — |

In the sustained ×25 run, the frontline was moving toward the red entrance at about 10 units/s before contact. By 34 s it was retreating toward the castle at about 9 units/s. In the matched no-armor comparison, schedule A's gate-only route won at 61.07 s and its deepest retreat was y = 429. With armor it fell back to y = 531 and took 93.78 s to win.

The supported route in schedule A unlocked the Purrapult at 24.67 s and landed its first hit at 25.78 s. Across 17 impacts it removed about 921 Pawtorians and 2,839 ordinary reds. Blue melee killed the other 579 Pawtorians. With the same aim schedule and artillery damage set to zero, the retreat reached y = 601 instead of y = 555, and cutoff slipped from 77.23 s to 116.42 s. Without Purrapult, blue melee eventually defeated all 1,500 Pawtorians. Both winning routes finished with more than 90,000 blue cats.

In schedule A, ×25 opened at 17.38 s, with its first arrivals at 18.82 s. The gate-only run opened ×100 at 39.78 s and got its first compounded arrivals at 40.25 s. The artillery route opened ×100 at 41.18 s and first compounded at 58.17 s after reclaiming relay access. The loss from waiting until 42 s illustrates the cost of spending volleys on wood while the vanguard is already pressing the line.

## Parameter comparisons

All six strategy outcomes held across nine combinations of 1,350–1,650 armored troops and 375–415 ordinary reinforcements/s, with both schedules. The sweep produced gate-only wins in 85–128 s and supported wins in 77–91 s. The selected midpoint leaves room for both strategies and gave artillery a 13–25 s advantage across the two schedules.

The relay comparison on schedule B gave gate-only wins in 127.27, 115.35, 112.92, and 111.60 s at relay factors of ×1, ×3, ×5, and ×7. The supported times were 94.05, 89.53, 87.67, and 86.95 s. The final gate matters through battlefield pressure. Compounding makes the recovered line surge, and with the tested aim schedules a skilled ×100-only defense can still win if the relay is removed. The marginal time gain from increasing the relay above ×5 was small.

## Reproduction and validation

```sh
node scripts/simulate-pawtorians.js
node scripts/simulate-pawtorians.js --sweep
npm test
npx playwright test tests/browser/pawtorians.spec.js tests/browser/purrapult.spec.js
```

Both schedules produced identical outcomes and telemetry at 30, 60, and 120 Hz. The tests cover population conservation, deterministic casualty allocation, finite arrival, restart and level switching, and the shared budget for impact reactions. The Level 1–4 simulation reports were byte-identical to main at `28f2420`.

Chromium portrait checks cover the level menu, one-finger aim, the advancing regiment, the frontline crisis, artillery, compounding reinforcements, victory, completion tracking, and a fresh replay. Run `npm run dev` and then `node scripts/capture-motion.js --pawtorians` to record a continuous 390×844 touch playthrough. Physical iPhone readability and performance remain playtest items.

In the continuous recording, the vanguard appears around 0:22, joins the frontline around 0:39, and takes an armored-rank artillery hit immediately afterward. The first compounded wave appears around 1:16 and blue captures the supply line around 1:41. These are wall-clock video positions. The simulation table reports time advanced by combat ticks.
