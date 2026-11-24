# SiegeDolls roadmap

SiegeDolls is a mobile-first arcade strategy game about miniature cats taking siege warfare a little too seriously. Slide the cannon with one finger, watch a few cats become an army, and decide when to reinforce the line or spend shots opening a better option. Ten levels are a planning horizon. Playtesting can reorder, simplify, replace, combine, or remove any proposed level.

## Design principles

- Keep the horizontal slide and automatic three-cat volleys. New targets should create choices through aim and timing. Keep the objective legible without extra inputs or a long tutorial.
- Make failure understandable and recovery possible. Expose the cost of shooting at wood or spending time away from a threatened approach. Keep the game free of monetization, artificial delays, and progression grind.
- Let simulation own arrivals, casualties, pressure, the frontline, and outcomes. The battlefield should explain what happened through troop movement, impact, and visible cause and effect.
- Keep the miniature-cat humor in crews, names, animation, and scenery. Keep input and tactical cues easy to read.
- Keep the existing balance-first cannon, multiplier, and frontline loop recognizable across levels. Distinct cat ranks and equipment should usually be visual storytelling, not a new unit-management system. If an elite formation has greater combat effectiveness, represent it transparently in the existing aggregate simulation rather than secretly contradicting the visuals.
- Reserve distinctive themed warrior formations for a few special encounters, not every level. Match the troops to the setting and architecture: Meowrtan hoplites only belong in a convincing Greek-inspired battlefield, for example. Never assign a theme merely to fit a pun; a well-executed familiar cat army is better than costume changes every round.
- Aim for short, replayable battles and smooth mobile Safari play. Reuse the lightweight Canvas renderer and bounded representative formations.

## Development status

Level 1 is the playable regression baseline. Level 2 adds yarn-ball artillery, Level 3 adds the Meowmen, and Level 4 turns two crossings into one asymmetric castle siege. Every implemented level stays available from the menu. The five merged milestones established modular JavaScript and CI, deterministic aim strategies and browser playthroughs, escalating frontline pressure, a wider battlefield and short victory sequence, then combat motion and optional sound. [Level 1 design](levels/level-01.md) · [Balance, tests, and recordings](level-1-balance.md)

**Implemented** means playable. **Next** identifies the current implementation candidate. **Proposed** means a preliminary design. **Under review** flags a decision or missing evidence that needs attention. **Deferred** records an intentional postponement. Titles and mechanics for Levels 5–10 are provisional.

## Levels 1–10

| Level | Working title | Status | Mechanic and dependency |
| --- | --- | --- | --- |
| 1 | [The Last Stand](levels/level-01.md) | Implemented | Multipliers, direct-hit barricades, and escalating pressure provide the shared baseline. |
| 2 | [The Purrapult](levels/level-02.md) | Implemented | Unlock a yarn-ball catapult. Shared level definitions, direct-hit wood, and simulation-owned artillery are in place. |
| 3 | [The Meowmen](levels/level-03.md) | Implemented | Unlock cat archers for steady ranged support. |
| 4 | [A Tale of Two Tails](levels/level-04.md) | Implemented | Reinforce two bottlenecks with one cannon, secure the west with the Meowrtan Phalanx, redeploy its infantry through the rear junction, and encircle the remaining horde after breaking through in the east. |
| 5 | [The Pawtorians](levels/level-05.md) | Proposed | Armored red cats make shot timing and support choice matter. Needs a readable mixed horde and distinct damage interactions. |
| 6 | [The Clawlossus](levels/level-06.md) | Proposed | A siege tower gives the player a moving target for concentrated damage. Builds on direct-hit targets and clear enemy threat states. |
| 7 | [The Cavalpurry](levels/level-07.md) | Proposed | Mounted blue cats charge periodically. Depends on a readable support windup and clear frontline impact. |
| 8 | [The Great Catastrophe](levels/level-08.md) | Proposed | Coordinated attacks across multiple fronts. Depends on a successful two-crossing playtest and readable attack warnings. |
| 9 | [General Meowhem](levels/level-09.md) | Proposed | An armored commander supports nearby red cats. Builds on readable special targets and a clear support effect. |
| 10 | [The Battle of Cattledonia](levels/level-10.md) | Proposed | Combine the strongest previously learned mechanics. Select the mix from earlier playtest evidence and the mobile performance budget. |

## Special formations and visual themes (provisional)

The recurring core can be humble kitten conscripts; selected battles may instead feature memorable elite formations, veteran knights, or culturally themed armies. The goal is variety in **scale, silhouette, formation, animation, and battlefield fantasy**, not a separate class system for each level. Level 4 uses bronze-helmed Meowrtans and a narrow stone-and-timber crossing to give its small shield formation a clear role and silhouette. Future themed encounters still need a setting and a distinct tactical role.

Do not distribute new army archetypes evenly across Levels 1–10. Introduce them selectively after reviewing the level's setting, player experience, rendering cost, and whether they make the battle more satisfying. Reuse existing army visuals between special encounters so the exceptions feel special. Preserve the decision of when to reinforce versus when to invest in unlocking another option. If a visual change needs strength tuning, keep the rationale and count-versus-effectiveness distinction legible to the player and regression-test the same strategic outcomes.

## Decisive-moment banners and battlefield humor (provisional)

Use occasional short, tongue-in-cheek banners to celebrate a **genuinely decisive turn** in a battle, particularly when a hard-earned final unlock, elite reinforcement, or counterattack makes victory feel within reach. Examples of candidate lines include **“THE PURRUSSIAN GUARD HAS ARRIVED”**, **“HOLD THE PURRIMETER”**, and setting-specific variants. Choose wording that fits that level's battlefield and troops; do not reuse the same gag in every level. These are examples, not required phrases or fixed level assignments.

- **Earn the cue.** An unlock alone is not proof that victory is assured. Trigger a decisive-moment announcement only from grounded game state (for example, sustained blue superiority, enemy supply cut off, and a substantial enemy collapse), with hysteresis or a one-time guard against oscillation. Alternatively use a clearly labeled *reinforcement-arrival* announcement for a dramatic unlock without implying the battle is won.
- **Keep it rare.** Prefer one memorable mid-to-late battle announcement in a suitable level over a stream of popups. Some levels should have none; reserve distinctive lines for special formations or climactic moments.
- **Don't interrupt controls.** A short banner and optional sound accent must not freeze combat, obscure the frontline, gate targets, or catapult, or delay the outcome. It should be readable on a portrait phone and respect muted sound settings.
- **Show the cause first.** Pair a banner with a visible arrival, cannon transformation, surge, or enemy collapse; text should amplify a strong visual event rather than stand in for one.
- **Preserve the distinction.** A dramatic *“the tide has turned”* banner is not the victory screen. Only the existing authoritative win condition declares victory.

A candidate future special encounter could unlock a **Royal Armory** after costly barricade work: subsequent cannon volleys through existing multipliers deploy visually distinct elite cats rather than ordinary militia. Keep the same one-finger input, gate counts, and aggregate combat engine; if elite effectiveness changes, model and explain it clearly, preserve remaining militia as militia, and balance unlock timing against the risk of neglecting defense. This is a **future design possibility**, not a commitment to add it to every level or to implement it during the current Level 2 polish milestone.

## Milestone sequence

1. **Milestone 6 · Roadmap and architecture.** Establish this plan, level briefs, and a lightweight review process.
2. **Milestone 7 · Level foundation and Level 2.** Shared level definitions, free level selection, and The Purrapult are playable. The original Level 1 simulation remains the regression baseline. [Architecture](level-architecture.md) · [Level 2 evidence](purrapult-balance.md)
3. **Milestone 8 · Battlefield impact and visual polish.** Faster Purrapult support and visible formation disruption join shared contact and reinforcement polish. Both levels retain their strategy outcomes. Check readability and enjoyment in a human session before choosing the next level. [Balance and motion evidence](purrapult-balance.md)
4. **Milestone 9 · Army scale and combat fidelity.** Literal small encounters, shared reserve scaling and population-driven formation reactions are part of the level foundation. [Army scale and combat evidence](army-visual-scale.md)
5. **Level 3 · The Meowmen.** Add unlockable ranged support.
6. **Milestone 17 · A Tale of Two Tails.** Release fixed-step lane combat and two-crossing cannon play. [Release archive](level-4-balance-m17.md)
7. **Milestone 18 · Hold the Flank, Break the Horde.** One castle and one invasion. Buy room on the west bridge, deploy the Meowrtan shield wall, then send the ×999 surge through the eastern ravine and capture the red command camp. [Historical balance](level-4-balance-m18.md)
8. **Milestone 19 · The Two-Front Siege.** Connect the west and east through one battlefield. Deliberate investments in the two ×99 gates and the shield wall buy time to redeploy, break the main army and strike the remaining reds from behind. [Level design](levels/level-04.md) · [Release balance](level-4-balance.md) · [Presentation](level-4-presentation.md)

Treat Levels 5–10 as candidates. Use playtest results from the support levels and the two crossings before planning mixed units or combined encounters.

## Open questions and review

Can players understand why a barrier is worth shooting while watching the frontline? Can support feel useful across several strategies? Can two approaches remain readable on a portrait screen? Do armor, siege objects, and commanders create distinct decisions? Physical iPhone performance, human win rates, and first-attempt comprehension still need playtesting.

After each level lands, use the [playtest log](playtest-log.md) to record what happened and what players thought. Decide whether its mechanic should return, reconsider the next candidate, and update the affected briefs, dependencies, priorities, and rationale in the same review. Maintain this page as the source of truth for current order and status. Keep implementation decisions and playtest evidence in the linked documents.
