# SiegeDolls playtest log

[Roadmap](roadmap.md) · [Level 1 baseline](level-1-balance.md)

Use one short entry per session or build. Identify the exact commit, PR, or deployment so observations can be reproduced. Mark a field as “unknown” when it was outside the session. Record automated evidence as automated and collect player impressions during human sessions.

## Entry template

### Date · Level and title · Build

**Session.** Device, OS, browser, input, fresh or returning player, and whether the player received instructions.

**Observations.** Outcome, approximate playtime, key decisions, when the objective or new mechanic was first understood, and any observable performance or usability problems. Note whether comprehension was observed or reported. Include timing, FPS, or captures where useful.

**Player impressions.** How intuitive the new mechanic felt, whether losing felt fair or winning satisfying, and what the player found enjoyable or frustrating. Short quotes are welcome.

**Recommended changes.** The smallest thing to change and what to check in the next session. Include related level briefs, roadmap decisions, and a PR or issue if one exists.

## Recorded baseline

### Milestone 5 · Level 1 · Main at `86cf1cf`

**Session.** Automated 30, 60, and 120 Hz strategies, plus Chromium at 390 × 844 with touch drags and mobile-emulated WebKit with mouse input. [Tested outcomes and recordings](level-1-balance.md)

**Observations.** Both balanced strategies cleared the level in roughly 96–97 seconds of combat. ×20-only, aggressive unlocking, and ×99-only after unlocking lost. The recorded HUD-hidden sequences show the gate outputs, a reversal, and the final collapse. Physical iPhone performance remains unmeasured.

**Player impressions.** Human comprehension, intuition, fairness, and satisfaction remain unrecorded.

**Recommended changes.** Use this run as a regression baseline. In human sessions, watch whether first-time players understand the trade-off between firing through a gate and breaking wood before offering help.

## Review after each new level

1. Compare observations and impressions. Decide whether the mechanic improved the battle, which choices players made, and what felt good or frustrating.
2. Decide whether the mechanic should return and whether the next proposed level still makes sense.
3. Update relevant level briefs, [roadmap statuses and priorities](roadmap.md), and [technical dependencies](level-architecture.md). Add a short revision note explaining why, with a link to the evidence or PR.

One entry and a short documentation edit are enough for most reviews.

## Milestone 7 automated baseline

**Session.** Level 2 deterministic runs at 30, 60, and 120 Hz, with Chromium native touch and mobile-emulated WebKit playthroughs at 390 × 844. [Results and recordings](purrapult-balance.md)

**Observations.** Both artillery sequences and the gate-only policy won. Passive defense and an unattended catapult lost. Turning off artillery damage made the early-artillery route lose on the same aim schedule. Browser coverage includes free Level 2 access, returning to the selector, replay, and saving a completion marker.

**Player impressions.** First-attempt targeting clarity, fairness, and the appeal of the artillery payoff remain open.

**Recommended changes.** In Milestone 8, watch whether players distinguish the catapult's aim lane and notice the difference between landing an impact and holding the line. Check responsiveness and sound on a physical iPhone. Use those findings when reconsidering the proposed archer level.


## Milestone 8 automated and visual review

**Session.** Deterministic strategies at 30, 60, and 120 Hz. Playwright browser runs at 390 × 844 and muted Chromium motion capture with native touch input. [Before and after results and recordings](purrapult-balance.md)

**Observations.** The Level 1 simulation matched the baseline. All five Level 2 policies retained their outcomes. The early support route made five more impacts before the win at 60 Hz. The encoded motion shows the projectile arriving, the red line opening and reforming, and reinforcement scale across all three gates.

**Player impressions.** Human impressions, device frame rate, and the sound mix on iPhone remain unmeasured.


## Milestone 10 · Army continuity

**Session.** The Milestone 9 visual population tests passed, then a gameplay report identified an abrupt disappearance of large blue formations. The follow-up traced actual 60 Hz combat, reproduced a fixed-front decline, and recorded three full battles at 390 × 844.

**Observations.** The largest old blue cut in the winning traces occurred at victory with no casualties that frame. Live attrition and forced depletion exposed smaller density cuts and reserve rearrangement. The updated clips retain the large arriving waves and show losses through falling ranks and local contact reactions. The unchanged strategies still produce the same simulation results. [Traces and recordings](army-visual-scale.md#milestone-10--army-continuity)

**Player impressions.** The disappearing formation was the reported issue. Human impressions of the correction and physical iPhone frame rate are still unmeasured.


## Milestone 11 · Reinforcement movement and victory advance

**Session.** A report described reinforcements reappearing at the rear and the front holding after the last red casualty. The follow-up traced the second ×20 arrival and recorded both complete winning battles in portrait Chromium with the HUD hidden.

**Observations.** The old wave tail and new field rows drew independently. The old celebration moved the flag while the blue formation stayed on the frozen front. Bounded handoffs now connect representative sprites to local slots. The lead enters the cleared approach on the existing victory clock and the reserves follow. [Before and after gameplay](army-visual-scale.md#portrait-gameplay-evidence)

**Player impressions.** No human feedback on the revised movement or physical-device timing was collected.

## Milestone 12 · Formation dynamics

The review starts from merged Milestone 11 at `685f84b`. The HUD-hidden Level 1 and Level 2 winning strategies exercise reinforcement growth, reversals, ×999 arrivals, artillery in Level 2 and the occupation surge. A labeled rendering fixture repeats the same hold, receipt, retreat and counterattack sequence on both builds so the movement can be compared without changes in player timing.

The Level 1 and Level 2 simulation output files match Milestone 11 byte for byte at 30, 60 and 120 Hz. The added render checks exercise slot continuity through an artillery hit and a reversal, live-line bounds, pressure release, local openings, reset and wave ownership. The new motion field also matches exactly at common time samples for the same observed battle. [Model, reproduction and limits](army-visual-scale.md#milestone-12--formation-dynamics-and-battlefield-momentum)

In the rendering fixture the packing value rose from 0.18 to 0.56 in the half-second after the ×99 arrival. The first 60 Hz frame of retreat moved the contact line by 0.27 world pixels while the depth anchors held their positions. At 0.20 seconds the rear anchor had yielded 0.19 pixels against the line's 3.47. The counterattack produced the same depth order in the opposite direction. In the normal Level 1 route, red pressure can still leave blue with zero resident troops before the final wave. That collapse comes from the existing battle balance and is visible in both builds.

The Level 1 video shows the victory panel. Level 2 shows elimination, the full advance and the occupation flag after 25 Purrapult impacts. The capture harness observed the result panel, and the video ends on the battlefield. Consecutive fixture frames show the front moving first at the reversal and a small local opening widening near the center during the counterattack. In the baseline fixture the front moves with the receiving formation following a single support delay. [Recordings and timing](army-visual-scale.md#formation-dynamics-evidence)

## Milestone 13 baseline diagnosis

Baseline is the Milestone 12 merge, `ba81c6f`. In a 1,000-blue versus
50,000-red engagement, red reserves contribute 650 blue casualties per second
and contact contributes 163. The initial 813/s is an authoritative loss.
The visual scale removes representation as population falls, which makes the
collapse striking, but does not cause the loss. Milestones 9–12 already document
bounded front ranks, artillery casualties, retirement and reinforcement handoff.
The old victory curve has a low initial slope, while frozen red retirement and
recent impact effects can persist into the celebration.

The 60 Hz baseline strategy trace sampled eleven policies across the two levels.
Nine had a positive on-field blue count with at least one sample projecting
three seconds or less at the current loss rate. This includes brief early
engagements with relief already marching and is a policy sample, not a player
frequency estimate. At 2 s, both starter policies had about 104 blue on field,
300 incoming and 2.0 s projected survival. The Level 1 barricade-first
policy had 284 blue, 4,955 red, 297 incoming, a front at 522 and 111 blue
casualties/s at 9 s. In the controlled 1,000-versus-50,000 fixture the old
on-field force is gone by the 2 s sample. The new force still has about
586 cats at 2 s and loses at the castle after 18.58 s if left unsupported.
The fixture seeds both populations and disables incoming red troops.
[Battle traces](evidence/combat-readability/battle-traces.json)

## Milestone 13 validation

The table uses 60 Hz updates. The timings exclude the 1.5 s victory
celebration. The full comparison includes casualties by side, artillery
contribution, final frontline, warning occurrence, and all three update
rates. Within each rate the policies are repeatable. Across rates, the
win/loss outcomes agree and event times can vary with the update interval.
[Strategy results](evidence/combat-readability/strategy-results.json)

| Level | Policy | Milestone 12 | Milestone 13 |
| --- | --- | --- | --- |
| 1 | ×20 only | Loss in 49.02 s | Loss in 59.58 s |
| 1 | Barricade-first | Loss in 34.25 s | Loss in 34.37 s |
| 1 | Balanced C | Win in 96.27 s | Win in 92.97 s |
| 1 | Balanced D | Win in 96.90 s | Win in 92.13 s |
| 1 | ×99 only after opening | Loss in 100.95 s | Loss in 122.50 s |
| 1 | Rush ×999 from the start | Loss in 16.83 s | Loss in 16.83 s |
| 2 | ×20 only | Loss in 47.38 s | Loss in 57.48 s |
| 2 | Artillery only | Loss in 16.83 s | Loss in 16.83 s |
| 2 | Gates only | Win in 102.83 s | Win in 98.43 s |
| 2 | Artillery-first with gates | Win in 93.02 s | Win in 91.70 s |
| 2 | Gates-first with artillery | Win in 105.48 s | Win in 100.05 s |

At 60 Hz, there are no post-change positive-blue samples with a raw
constant-loss projection of 3 s or less in the eleven policies. Blue armies
can still lose ground rapidly from an empty front. The late timed rescue
tests establish that a sustained ×99 volley can turn the same barricade
attack that otherwise ends in defeat. The forecast is a trend estimate
because the front, supply, and casualty rate keep moving.
[Rescue timing and formulas](level-1-balance.md#milestone-13-engagement-and-reaction-timing)

### Portrait recordings

The clips use the live game at 390 × 844 and automated touch drags through
the normal controls. The standard HUD is hidden for battlefield visibility.
The danger message and victory overlays are visible in the recordings.
The paired rescue clips follow the same aiming policy up to the first
warning. Browser wall time can differ from simulation time under load.

- A shows contested early combat and temporary lane openings. [Early exchanges](evidence/combat-readability/m13-a-local-combat.mp4)
- B shows the ×99 arrivals and the blue line reversing the retreat. [Pushback](evidence/combat-readability/m13-b-pushback.mp4)
- C shows the alert, cannon redirection, and stabilization. [Rescue](evidence/combat-readability/m13-c-rescue.mp4)
- D continues to target the barricade through the warning. [Defeat](evidence/combat-readability/m13-d-ignored.mp4) · [Result screen](evidence/combat-readability/m13-d-result.png)
- E compares the recorded Level 1 victory transitions. [Milestone 12](evidence/combat-readability/m12-level-1-victory.mp4) · [Milestone 13](evidence/combat-readability/m13-e-level-1.mp4)
- F compares the recorded artillery-assisted Level 2 victory transitions. [Milestone 12](evidence/combat-readability/m12-level-2-victory.mp4) · [Milestone 13](evidence/combat-readability/m13-f-level-2.mp4)

The before clips come from the Milestone 12 playthroughs. The ending
frontlines differ because of the combat retune. Consecutive-frame review
focused on the contested ranks around 5 s in A, the warning and arrival
from 2–5 s in C, and the frames around 2.5 s in both final charge clips.
The isolated charge curve comparison holds the final front fixed at 85.
At 0.2 s the lead advances 5.5 units before and 28.9 after. At 0.5 s the
lead has traveled 58.1 units and the deepest ranks 20.7 on the new curve.
[Capture timing](evidence/combat-readability/capture-timing.json)

### Browser verification and performance

All 76 Node tests passed. All eight Chromium and eight mobile-emulated WebKit
Playwright tests passed, including the paired warning test and both results.

Headless profiles used a 390 × 844 viewport at 2× device pixel ratio on the
Linux workspace. The artillery scene begins with 46,893 red and 17,688 blue
cats during ×999 reinforcements and an artillery impact. The victory scene
begins with 159,192 blue cats. The 500,000-red and 200,000-blue scene and the
rapid decline are controlled renderer fixtures.

| Scene | Chromium frame interval, median / p95 | WebKit frame interval, median / p95 |
| --- | --- | --- |
| Reinforcements and artillery | 16.7 / 16.8 ms | 30 / 52 ms |
| Victory charge | 16.7 / 16.8 ms | 28 / 47 ms |
| Large-army fixture | 16.7 / 16.7 ms | 27 / 49 ms |
| Rapid-decline fixture | 16.7 / 16.8 ms | 27 / 53 ms |

Median simulation and draw submission were 1.1–2.3 ms in Chromium and
1–2 ms in WebKit. Submission time excludes browser compositing and other
frame costs. WebKit had more variation in frame intervals. These are
headless Linux measurements. Physical iPhone performance and human reaction
time remain unmeasured. [Chromium profile](evidence/combat-readability/headless-chromium.json) · [WebKit profile](evidence/combat-readability/headless-webkit.json)

## Milestone 17C · A Tale of Two Tails

The 390 × 844 Chromium touch replay entered through the normal selector
and used the upgrade-focused plan. East reached the danger band as its
outer gate opened. The upgraded arrivals reversed the retreat, and the
warning cleared after the line recovered. West kept moving independently.
The final red defenders were still present just before the dual charge.
Both flags rose before the victory overlay. The two portrait recordings
and gameplay and victory stills accompany the review outside Git.

Starter-only alternation and responsive switching won in deterministic
replays. Holding either side caused a breach on the other. The release
buys time to recover compared with the development fixture. Five-second
switches are an automated reference point. Human reaction time and
physical iPhone frame pacing remain unmeasured.
[Level 4 rules](levels/level-04.md) · [Strategy results](level-4-balance.md)

`npm test` passed all 20 test files. All 32 Chromium and WebKit
Playwright cases passed across the full suite and targeted reruns. The
Level 1 strategy and Levels 2–3 support reports matched 17B byte for
byte. All six Level 4 strategies matched across 30, 60, and 120 Hz.

### Portrait frame pacing

An isolated headless Linux profile used a 390 × 844 viewport and 2×
device scale. Each crossing started the test with 4,500 blue and 2,900
red cats. After a short warm-up, eight seconds of active battle exercised
both compact formations, red intake, and melee effects. Frame intervals
include browser scheduling. Submission measures the simulation and
Canvas calls from the animation-frame callback.

| Engine | Frame interval median / p95 | Submission median / p95 |
| --- | --- | --- |
| Chromium | 16.7 / 16.8 ms | 0.5 / 1.0 ms |
| WebKit | 18 / 42 ms | 1 / 1 ms |

Each crossing draws up to 30 cats per army and four airborne
representatives. The terrain is cached, and red intake is batched. WebKit
had more variable frame intervals in this environment.
