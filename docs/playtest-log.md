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
