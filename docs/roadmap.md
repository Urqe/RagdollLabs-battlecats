# SiegeDolls roadmap

SiegeDolls is a mobile-first arcade strategy game about miniature cats taking siege warfare a little too seriously. Slide the cannon with one finger, watch a few cats become an army, and decide when to reinforce the line or spend shots opening a better option. Ten levels are a planning horizon. Playtesting can reorder, simplify, replace, combine, or remove any proposed level.

## Design principles

- Keep the horizontal slide and automatic three-cat volleys. New targets should create choices through aim and timing. Keep the objective legible without extra inputs or a long tutorial.
- Make failure understandable and recovery possible. Expose the cost of shooting at wood or spending time away from a threatened approach. Keep the game free of monetization, artificial delays, and progression grind.
- Let simulation own arrivals, casualties, pressure, the frontline, and outcomes. The battlefield should explain what happened through troop movement, impact, and visible cause and effect.
- Keep the miniature-cat humor in crews, names, animation, and scenery. Keep input and tactical cues easy to read.
- Aim for short, replayable battles and smooth mobile Safari play. Reuse the lightweight Canvas renderer and bounded representative formations.

## Development status

Level 1 is the playable baseline. The five merged milestones established modular JavaScript and CI, deterministic aim strategies and browser playthroughs, escalating frontline pressure, a wider battlefield and short victory sequence, then combat motion and optional sound. [Level 1 design](levels/level-01.md) · [Balance, tests, and recordings](level-1-balance.md)

**Implemented** means playable. **Next** identifies the current implementation candidate. **Proposed** means a preliminary design. **Under review** flags a decision or missing evidence that needs attention. **Deferred** records an intentional postponement. Titles and mechanics for Levels 2–10 are provisional.

## Levels 1–10

| Level | Working title | Status | Mechanic and dependency |
| --- | --- | --- | --- |
| 1 | [The Last Stand](levels/level-01.md) | Implemented | Multipliers, direct-hit barricades, and escalating pressure provide the shared baseline. |
| 2 | [The Purrapult](levels/level-02.md) | Next | Unlock a yarn-ball catapult. Requires a second level definition, reusable hit targets, and simulation-owned support impacts. |
| 3 | [The Meowmen](levels/level-03.md) | Proposed | Unlock cat archers for steady ranged support. Depends on artillery findings and a reusable support lifecycle. |
| 4 | [A Tale of Two Tails](levels/level-04.md) | Proposed | Split attention between two crossings. Needs readable lane-specific pressure, routing, and breach rules. |
| 5 | [The Pawtorians](levels/level-05.md) | Proposed | Armored red cats make shot timing and support choice matter. Needs a readable mixed horde and distinct damage interactions. |
| 6 | [The Clawlossus](levels/level-06.md) | Proposed | A siege tower gives the player a moving target for concentrated damage. Builds on direct-hit targets and clear enemy threat states. |
| 7 | [The Cavalpurry](levels/level-07.md) | Proposed | Mounted blue cats charge periodically. Depends on a readable support windup and clear frontline impact. |
| 8 | [The Great Catastrophe](levels/level-08.md) | Proposed | Coordinated attacks across multiple fronts. Depends on a successful two-crossing playtest and readable attack warnings. |
| 9 | [General Meowhem](levels/level-09.md) | Proposed | An armored commander supports nearby red cats. Builds on readable special targets and a clear support effect. |
| 10 | [The Battle of Cattledonia](levels/level-10.md) | Proposed | Combine the strongest previously learned mechanics. Select the mix from earlier playtest evidence and the mobile performance budget. |

## Milestone sequence

1. **Milestone 6 · Roadmap and architecture.** Establish this plan, level briefs, and a lightweight review process.
2. **Milestone 7 · Level foundation and Level 2.** Extract the smallest shared configuration needed by The Purrapult, add a minimal selector, and implement the artillery prototype. Keep Level 1 behavior covered by its existing regression baseline. [Migration proposal](level-architecture.md)
3. **Milestone 8 · Level 2 playtesting and refinement.** Evaluate artillery clarity, balance, and enjoyment. Revisit the next level using observations.
4. **Milestone 9 · Level 3 candidate.** Prototype ranged support if testing identifies a distinct tactical role for it. Use Level 2 lessons to define scope.

Treat Levels 4–10 as candidates while the support mechanics and their mobile cost are being validated. Prioritize readable choices and short feedback cycles before lane routing, mixed unit populations, or combined encounters.

## Open questions and review

Can players understand why a barrier is worth shooting while watching the frontline? Can support feel useful across several strategies? Can two approaches remain readable on a portrait screen? Do armor, siege objects, and commanders create distinct decisions? Physical iPhone performance, human win rates, and first-attempt comprehension still need playtesting.

After each level lands, use the [playtest log](playtest-log.md) to record what happened and what players thought. Decide whether its mechanic should return, reconsider the next candidate, and update the affected briefs, dependencies, priorities, and rationale in the same review. Maintain this page as the source of truth for current order and status. Keep implementation decisions and playtest evidence in the linked documents.
