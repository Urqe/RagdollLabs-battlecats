# Level 2 · The Purrapult

[Roadmap](../roadmap.md)

## Identity

**Status** · Implemented. Break a barricade to recruit a tiny catapult crew that launches oversized yarn balls into the red horde.

## Player experience

Level 1 asks when to stop reinforcing for a better gate. The Purrapult adds a second kind of investment with a delayed payoff. The player splits volleys between the current gate, stronger gates, and artillery wood. The payoff should be visible as a yarn ball arcs over the line and opens a gap while blue troops press forward. A too-small crew winding a too-large siege engine provides the joke.

## Mechanics

- Keep the horizontal slide, three-cat auto-fire, gate multipliers, marching arrivals, direct wood hits, and escalating red pressure. Cannon shots at the catapult's barricade advance its unlock and produce no defenders.
- The crew fires **automatically after unlocking**. A visible reload leads to a launch toward a dense eligible red concentration. After a 2.4-second reload, the shot travels for 0.94 seconds before resolving bounded splash damage. At a successful impact, cats tumble out of the formation and survivors march back through the opening while the crew winds up the next shot. A completed reload waits for a red target. The art follows resolved impacts and the actual remaining horde.
- Artillery buys time and reduces pressure. The blue line still needs reinforcements to secure the supply route. Level 1’s supply cutoff and castle-breach rules also apply here. If the supply route is already secured, a final artillery casualty can end the battle.
- **Ammunition alternative.** The cannon could periodically reload the crew by aiming at a supply target. That creates an ongoing choice and can curb an overpowered unlock, but adds another target state and asks the player to monitor reloads while switching among gates. Begin with automatic fire and test wood cost, reload cadence, splash, and exposure before testing an ammunition loop.

## Battlefield

One crossing connects the red mustering yard to the broad blue approach. From left to right, the blue approach has ×25, the open ×5 starter, ×100, and the Purrapult. The catapult has its own barricade and aim footprint with room for all three projectiles. The arcing shot should be visible above the crowd without covering the front or the gate labels. Red still enters from the far side through one supply route.

## Multiplier progression

The ×5 gate can hold the opening. ×25 reinforces the defense while the player works on another barricade. The Purrapult can steady the line while red supply builds. Sustained ×25 and artillery eventually give ground. Arriving ×100 waves can reverse the retreat, secure the supply route, and clear the remaining reds. Both gate-only and artillery-assisted routes won at 30, 60, and 120 Hz. [Balance note](../purrapult-balance.md)

## Implementation considerations

The catapult uses shared [level definitions and direct-hit targets](../level-architecture.md). A yarn ball locks a target window at launch and resolves against the red band at impact. The renderer uses the same flight and impact state. Node tests cover misses, repeated impacts, reload and reset, and a final artillery casualty. Chromium and WebKit exercise level selection and full Level 2 battles.

## Open questions

Can players tell where to aim to free the crew and why unlocking it matters? Which emplacement keeps cannon aim clear? Does a ball landing in its original window feel fair when the front moves? How distinctive and useful is support without making it a required win switch? Would ammunition create a worthwhile decision after players learn the base version?

## Revision history

Milestone 6 selected automatic fire for the first prototype. Milestone 7 implemented it, added free level selection, and established simulated balance and browser evidence. Milestone 8 shortened the reload, reduced the per-hit cap and added impact reactions driven by resolved losses. Human playtesting is next. [Playtest log](../playtest-log.md)

## Army movement

Infantry uses the shared rear-first receiving and advance rules. The Purrapult retains its damage and independently moves the red line on impact. [Milestone 21](../living-armies.md)
