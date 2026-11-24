# Level 4 release balance · Milestone 19C

For the current pressure model and balance, see [Milestone 22 · Arcade combat](arcade-combat.md). The figures below describe the earlier milestone.

The Level 4 menu opens the connected siege. [Level rules](levels/level-04.md) · [Presentation and recordings](level-4-presentation.md) · [Milestone 18 archive](level-4-balance-m18.md) · [Milestone 17 archive](level-4-balance-m17.md)

| Setting | West | East |
| --- | ---: | ---: |
| Starting blue / red | 300 / 570 | 615 / 660 |
| Red intake per second | 15 + 5.1t, capped at 800 | 39 + 2.9t, capped at 270 |
| Maximum ordinary red losses per second | 83 | 235 |
| Red pressure per cat | 0.66 | 0.65 |
| Blue contact losses per engaged cat per second | 0.17 | 0.075 |
| Maximum red advance per second | 12 | 10 |
| Maximum blue advance per second | 6.5 | 5.7 |
| Blue frontage | 850 | Full advance at 36,000 |

The phalanx costs 132 hits and east ×999 costs 90. Each ×99 costs 30.
The old 36-hit wall was too cheap relative to either branch's defense.
The slower west intake ramp extends the period when reinforced troops
can hold. The larger opening west force and stronger contact losses
make an unsupported west barricade rush risky. The east starts with a lower intake and lower blue contact
losses per engaged cat, so intermittent ×20 cover can buy time. A
completely neglected east can still fall before reinforcements from west
reach it. There are no time-triggered pressure phases or gate prerequisites.
[Final definitions](../src/levels.js)

## Deterministic policies

Run `node scripts/simulate-dual.js` for all 17 policies at 30, 60 and 120 Hz.
Aim decisions occur on the same simulation-second boundaries and use the
normal projectile, barricade and march code. Results and SHA-256 hashes
of the complete ordered authoritative event streams match across all
three schedules. Times exclude the 3.2-second victory celebration.
Blue survivors include soldiers still marching. The transfer column
counts completed arrivals, including rallied squads.

| Policy | Result | Combat s | Unlocks s (W99 / E99 / wall / E999) | Deploy / secure s | Main break s | Encircle s |
| --- | --- | ---: | --- | --- | ---: | ---: |
| Camp west ×20 | right breach | 31.3 | — / — / — / — | — / — | — | — |
| Camp east ×20 | left breach | 19.7 | — / — / — / — | — / — | — | — |
| Alternate ×20 every two seconds | left breach | 48.3 | — / — / — / — | — / — | — | — |
| Rush phalanx, then open the east upgrades | left breach | 19.7 | — / — / — / — | — / — | — | — |
| Open west ×99 and phalanx, then stay on west ×99 | left breach | 24.1 | 4.4 / — / — / — | — / — | — | — |
| Rush east ×999 | left breach | 19.7 | — / — / — / 13.6 | — / — | — | — |
| Both ×99, then phalanx and ×999 | Win | 126.7 | 11.3 / 18.2 / 48.1 / 65.6 | 50.5 / 51.7 | 114.8 | 12.0 |
| Adaptive threat-based defense | Win | 104.9 | 10.4 / 15.5 / 48.6 / 66.5 | 51.0 / 52.2 | 92.5 | 12.4 |
| West ×99 and phalanx before east upgrades | Win | 107.7 | 9.5 / 62.4 / 54.1 / 76.6 | 56.5 / 57.7 | 92.8 | 14.9 |
| Both ×99 and phalanx, then rely on east ×99 | Win | 144.0 | 11.3 / 18.2 / 48.1 / — | 50.5 / 51.7 | 132.6 | 11.3 |
| Skip west ×99 | left breach | 37.7 | — / 12.2 / — / — | — / — | — | — |
| Skip east ×99 | right breach | 70.7 | 11.3 / — / 44.9 / — | 47.3 / 48.5 | — | — |
| Use both ×99 without the phalanx | left breach | 68.4 | 11.3 / 21.0 / — / — | — / — | — | — |
| Adaptive, seven-second decision cycle | Win | 108.2 | 11.3 / 18.2 / 55.9 / 73.9 | 58.4 / 59.5 | 92.9 | 15.3 |
| Adaptive, off-center aim and missed upgrade windows | Win | 128.4 | 11.3 / 18.2 / 51.8 / 70.6 | 54.2 / 55.4 | 114.8 | 13.6 |
| West ×20 for 2 s and east ×20 for 5 s, then rush phalanx | left breach | 25.2 | — / — / — / — | — / — | — | — |
| West ×20 for 5 s and east ×20 for 3 s, then rush phalanx | Win | 133.7 | — / 33.4 / 28.3 / 59.6 | 30.8 / 31.9 | 126.0 | 7.7 |

| Policy | Blue survivors | Original infantry withdrawn | Total transferred | Red casualties | Routed reds |
| --- | ---: | ---: | ---: | ---: | ---: |
| Camp west ×20 | 2,059 | — | — | 3,481 | — |
| Camp east ×20 | 2,910 | — | — | 2,257 | — |
| Alternate ×20 every two seconds | 3,569 | — | — | 8,920 | — |
| Rush phalanx, then open the east upgrades | 62 | — | — | 1,191 | — |
| Open west ×99 and phalanx, then stay on west ×99 | 32 | — | — | 1,505 | — |
| Rush east ×999 | 38,911 | — | — | 2,004 | — |
| Both ×99, then phalanx and ×999 | 386,320 | 1,101 | 1,398 | 25,270 | 2,787 |
| Adaptive threat-based defense | 248,267 | 1,224 | 2,115 | 20,974 | 3,094 |
| West ×99 and phalanx before east upgrades | 195,410 | 1,242 | 1,242 | 21,834 | 3,941 |
| Both ×99 and phalanx, then rely on east ×99 | 46,591 | 1,101 | 1,398 | 29,556 | 2,709 |
| Skip west ×99 | 2,297 | — | — | 5,843 | — |
| Skip east ×99 | 922 | 1,302 | 2,193 | 10,617 | — |
| Use both ×99 without the phalanx | 11,473 | — | — | 15,457 | — |
| Adaptive, seven-second decision cycle | 218,436 | 1,652 | 2,543 | 22,125 | 4,242 |
| Adaptive, off-center aim and missed upgrade windows | 364,990 | 1,411 | 2,302 | 25,779 | 3,440 |
| West ×20 for 2 s and east ×20 for 5 s, then rush phalanx | 826 | — | — | 3,149 | — |
| West ×20 for 5 s and east ×20 for 3 s, then rush phalanx | 477,818 | 2 | 2 | 24,991 | 1,287 |

Both ×99 first wins in 126.7 s. Skipping west ×99 in that policy
loses the west, and skipping east ×99 loses the east. Even five
seconds of west ×20 cover and three of east ×20 before rushing the
wall leaves about two ordinary west survivors to withdraw and takes
133.7 s to win. The successful ×99 policies preserve 1,101–1,652 west
infantry and have multiple timings that win. The west-first alternative
can win by using east ×20 cover and opening its ×99 after the wall
secures. In the matched ×99-only finish, main breakthrough comes
about 17.8 s later and the full battle lasts 144.0 s. The off-center
variant uses a ±10 logical-unit aim bias and three one-second detours
through the central gap.

## Why a battle without the phalanx had to lose

West red intake stays at full access at every ordinary frontline
position. The west minimum is 265, above the reinforcement cutoff of
120 plus its 16-unit taper. Taking the east cutoff alone does not close
west supply. The shared cutoff and encirclement require the secured wall.

For an optimistic bound, grant the ordinary west army its maximum blue
pressure of 850 and its maximum 83 red kills per second from the first
tick, with unlimited cannon fire and no march delays. At each 1/60-second
tick the lower bound on surviving reds is the previous bound plus
intake minus 83 per second, clamped at zero. That red count and maximum
blue pressure give the smallest possible redward momentum. The actual
reachable frontline is always at least as far toward the castle as
this optimistic line. Even that line crosses the castle threshold
at **75.37 s**. Since west supply eventually exceeds its casualty cap
and cannot be cut by ordinary west infantry, arbitrarily many arrivals
give no way around this bound. [Historical executable bound](https://github.com/Urqe/RagdollLabs-battlecats/blob/d5e281c/tests/dual-battlefield.test.js)

## Regression and release limits

The public selector tests exercise pointer aim, both breaches, gate costs,
deployment, transfer, the encirclement, pause, restart, level switching,
the result flag and saved completion in Chromium and WebKit. The Level 1
and Level 2–3 strategy scripts provide the previous-level comparisons.
The physical iPhone and first-time-player experience remain unverified.

[Full balance data and event hashes](https://github.com/Urqe/RagdollLabs-battlecats/blob/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/balance.json)

## Milestone 20 matched replays

Barricade costs remain 30 / 132 / 30 / 90 in west ×99, phalanx, east ×99
and east ×999 order. While east reinforcements have access, red losses
are bounded by three times the current red population per second, in
addition to the existing blue attack and lane caps. This leaves living
defenders available for contact when a small incoming stream meets a much
larger blue army. Supply cutoff restores the finite cleanup rule.

March and deployment remain 2.4 s and 1.15 s. The new locked push advances
at 30 battlefield units/s. Shelling the wall barricade immediately still
fails, and ordinary infantry cannot hold the west indefinitely. The
sustained starter-fed rush still wins, taking over 25 s longer than the
adaptive policy. The east ×99-only finish remains possible and slower.

Here are the changed outcomes by elapsed time, in simulation seconds.
Win/loss and breached fronts match 19C across all 17 policies. The current
fixed-step event digests match at 30, 60 and 120 Hz.

| Policy | 19C | Milestone 20 |
| --- | ---: | ---: |
| Double upgrade | Win 126.7 | Win 132.4 |
| Adaptive | Win 104.9 | Win 108.6 |
| Flank first | Win 107.7 | Win 113.4 |
| No ×999 | Win 144.0 | Win 151.3 |
| Skip east ×99 | Defeat 70.7 | Defeat 54.3 |
| Adaptive seven | Win 108.2 | Win 112.6 |
| Adaptive imperfect | Win 128.4 | Win 136.4 |
| Sustained starter rush | Win 133.7 | Win 133.8 |

Reproduce with `node scripts/simulate-dual.js`.
