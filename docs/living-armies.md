# Milestone 21 · Living Armies

For the current pressure model and balance, see [Milestone 22 · Arcade combat](arcade-combat.md). The figures below describe the earlier milestone.

## 21A · Organic Combat Dynamics

Before this milestone, relative pressure could reach its maximum while the
leader remained capped at the ordinary combat advance speed. A blue army of
300,000 starting at y=240 with four red reinforcements per second took 21.07 s
to reach the east supply cutoff at y=120. The same fixture now reaches the
cutoff in 10.12 s. Its 37.81 arrivals by cutoff account for 37.50 casualties
and 0.31 red survivors. With 30,000 standing reds, the army stays contested
at that timestamp and advances substantially less.

Each lane measures relative pressure and absolute opposition against its
combat capacity. A committed army can enter overwhelming advance at a
6% relative opposition threshold. It enters an organized march below 1.5%
with a tighter absolute threshold. The separate exit thresholds are 10%
and 3.5%. The original pressure term governs contested movement. The
overwhelming and marching states add 55% and 110% of the blue advance
speed, with a smaller red extension. The bonus changes by at most
18 battlefield units/s². A reversal of pressure discards the old direction's
bonus. The same fixed-step casualty and supply rules govern all states.

Level 1's rescue strategy makes the changed march especially visible.
Levels 2 and 3 keep their original artillery displacement and arrow damage.
The east branch of Level 4 requires standing pressure of 54,000 before it
can take the faster march. In the initial trial, an earlier threshold cut
supply before enough troops had built up to sustain the automatic flank.
The west's frontage cap, reinforcements, shield push, transfer routes and
flank quota retain their existing rules. The no-phalanx replay still loses
at the west crossing.

### Matched strategy results

The baseline is `a32e647`. Times below stop at the authoritative victory
or breach. Matched fixed-clock replays produced identical ordered events
at 30, 60 and 120 Hz within each version. Arrival counts and close-of-play
combat totals can change as the timing or approach changes. The comparison
report includes five-second frontline trajectories, troop arrivals, losses,
cutoffs, support event counts and Level 4 milestones.

| Level and policy | Baseline result / seconds | Milestone result / seconds | Supply cutoff before / after |
| --- | --- | --- | --- |
| 1 · Balanced C | Victory / 92.97 | Victory / 92.97 | 89.98 / 89.98 |
| 1 · Rescue | Victory / 74.50 | Victory / 63.15 | 74.50 / 63.15 |
| 2 · Artillery first | Victory / 83.30 | Victory / 83.30 | 82.37 / 82.37 |
| 3 · Balanced | Victory / 91.98 | Victory / 90.75 | 91.98 / 90.75 |
| 4 · Adaptive seven | Victory / 112.63 | Victory / 112.63 | 95.38 / 95.38 |
| 4 · Double upgrade | Victory / 132.43 | Victory / 132.43 | 110.75 / 110.75 |
| 4 · No phalanx | Defeat / 68.43 | Defeat / 68.43 | — |
| 4 · Sustained starter rush | Victory / 133.78 | Victory / 134.43 | 116.87 / 117.42 |

The rescue replay therefore admits 236,088 blue infantry by victory,
down from 358,965. The matched artillery and archer policies still deal
64,178 and 42,513 support damage respectively, rounded to whole cats.
Adaptive seven secures the wall at 65.95 s and runs the flank for 15.32 s
in both versions. Sustained starter rush secures the wall at 38.50 s,
up from 38.02 s, and keeps its 7.70 s encirclement. All 17 Level 4 replay
outcomes held. The early one-gate defeats resolve around 0.5–1.0 s sooner.

## 21B · Living Formations

The single corridor previously aimed its visual waves at an approximate
rear depth, then let them continue toward contact. The result was most
obvious when a far reserve slot became active after that approach. The
connected battlefield instead ended west routes at a static rally point
and dropped completed cohorts from presentation on the arrival tick.
It also used an estimated east receiver independent of the drawn reserve.

The single corridor now measures its occupied reserve bands and eases
waves into that shoulder. A cohort's existing assignments give
priority to available field slots before reserve slots. The wider
center-out field fills frontage and supporting ranks before opening
more depth. Arrivals interpolate laterally to claimed slots on the
same approach. Obstructed gates still use a short complementary fade
where a direct path would visibly cross a barricade.

Both connected approaches now place the receiver behind their visible
standing ranks. West approach paths pass around the outside of the
ridge, while right approaches and transferred infantry use the existing
junction route. After an authoritative arrival, a bounded visual tail
continues from the endpoint as standing rank coverage grows. The early
west path retains its timing, and the phalanx handoff clears any visual
tails already accounted for in the withdrawing west infantry.

Both renderers use stable, center-out slots and terrain-limited spacing.
The existing rank lag follows frontline movement. A casualty pulse pulls
nearby ranks forward in order, with depth-dependent delay and bounded
travel. Distant files retain their positions until local motion reaches
them. Temporary cohort tails, rank pulls and falling representatives
have fixed budgets. Authoritative population and damage never depend on
those animations. Representative bodies still use approximate spacing
when formations compress tightly at a choke.

## Portrait verification

Videos use the normal level selector and cannon input at 390 × 844.
The winning Level 1 and Level 4 recordings are uninterrupted. The
short breakthrough clip uses the separate Level 1 rescue replay.
Physical iPhone performance remains unverified.

The unrecorded profile samples the real Canvas renderers after a 350 ms
warm-up at each fixed replay checkpoint. Each window contains roughly
1.85 s of live frames. The table gives p50 / p95 in milliseconds.
Each cell shows baseline → Milestone 21.

| Phase | Chromium frame | Chromium Canvas | WebKit frame | WebKit Canvas |
| --- | ---: | ---: | ---: | ---: |
| Early combat | 16.7 / 16.7 → 16.7 / 16.7 | 1.4 / 2 → 1.1 / 1.7 | 16 / 17 → 16 / 17 | 1 / 2 → 1 / 2 |
| Growing formations | 16.7 / 16.7 → 16.7 / 16.7 | 1.3 / 2 → 1.3 / 1.8 | 16 / 17 → 16 / 17 | 1 / 2 → 1 / 2 |
| ×999 arrivals | 16.7 / 16.7 → 16.7 / 16.7 | 1.5 / 1.8 → 1.4 / 1.8 | 16 / 18 → 16 / 17 | 1 / 2 → 1 / 2 |
| Overwhelming advance | 16.7 / 16.8 → 16.7 / 16.7 | 1.4 / 2 → 1.4 / 1.9 | 16 / 17 → 16 / 21 | 1 / 2 → 1 / 2 |
| Phalanx defense | 16.7 / 16.8 → 16.7 / 16.8 | 1.2 / 1.6 → 1 / 1.6 | 16 / 17 → 16 / 17 | 1 / 1 → 1 / 2 |
| Infantry redeployment | 16.7 / 16.8 → 16.7 / 16.8 | 1.5 / 2 → 1.3 / 1.9 | 16 / 17 → 16 / 17 | 1 / 2 → 1 / 2 |
| Encirclement | 16.7 / 16.7 → 16.7 / 16.7 | 1.2 / 1.6 → 1.3 / 1.9 | 16 / 19 → 16 / 17 | 1 / 2 → 1 / 2 |

| Phase | Detailed sprites | Reserve silhouettes | Airborne | Moving cohorts | Visual joins |
| --- | ---: | ---: | ---: | ---: | ---: |
| Early combat | 511 | 312 | 6 | 18 | 9 |
| Growing formations | 633 | 690 | 6 | 15 | 9 |
| ×999 arrivals | 668 | 1,422 | 7 | 6 | 12 |
| Overwhelming advance | 990 | 1,260 | 0 | 33 | 12 |
| Phalanx defense | 443 | 1,148 | 16 | 0 | 0 |
| Infantry redeployment | 538 | 1,717 | 16 | 16 | 3 |
| Encirclement | 447 | 2,850 | 16 | 15 | 3 |

Counts are independent peaks across both engines. Detailed sprites
include moving representatives. The redeployment sample includes up to
ten withdrawal cohorts. The rear sample includes one engaged flank.
Temporary joins peak at 12 for the single corridor and three for the
sampled connected windows.

The table is the quiet-host pass before the last reserve replenishment
refinement. We repeated the paired profile with the final renderer while
Playwright was running. Chromium frame p95 ranged from 16.7 to 33.4 ms
and WebKit from 67 to 92 ms. Canvas draw p95 peaked at 6.1 ms and 8 ms
respectively, compared with 7 ms and 8 ms for the baseline in that pass.
Frame scheduling under load varied in both versions. Neither pass measures
physical Safari hardware.

| Video | Sequence |
| --- | --- |
| [A · Reinforcement integration](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/a-reinforcement-integration.mp4) | Level 1 rear receiving and side growth |
| [B · Overwhelming advance](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/b-overwhelming-advance.mp4) | Level 1 march toward the open red entrance |
| [C · Support weapons](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/c-support-regressions.mp4) | Purrapult and Meowmen impacts |
| [D · Early battle](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/d-early-two-fronts.mp4) | Both Level 4 approaches receiving recruits |
| [E · Phalanx and transfer](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/e-phalanx-and-transfer.mp4) | West shield wall and east receiving |
| [F · Breakthrough and encirclement](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/f-breakthrough-and-encirclement.mp4) | East advance and rear rout |

[Uninterrupted Level 1](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/level-1.webm) ·
[Uninterrupted Level 4](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/level-4.webm)

[Matched strategy data](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/strategy-comparison.json) ·
[Quiet-host profiles](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/portrait-profiles.json) ·
[Final renderer profiles](https://github.com/Urqe/RagdollLabs-battlecats/raw/f8edd57a8d6279be1c40ef4d673469220c17b49f/portrait-profiles-final.json)
