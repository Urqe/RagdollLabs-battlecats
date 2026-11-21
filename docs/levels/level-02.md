# Level 2 · The Purrapult

[Roadmap](../roadmap.md)

## Identity

**Status** · Next. Break a barricade to recruit a tiny catapult crew that launches oversized yarn balls into the red horde.

## Player experience

Level 1 asks when to stop reinforcing for a better gate. The Purrapult adds a second kind of investment with a delayed payoff. The player splits volleys between the current gate, stronger gates, and artillery wood. The payoff should be visible as a yarn ball arcs over the line and opens a gap while blue troops press forward. A too-small crew winding a too-large siege engine provides the joke.

## Mechanics

- Keep the horizontal slide, three-cat auto-fire, gate multipliers, marching arrivals, direct wood hits, and escalating red pressure. Cannon shots at the catapult's barricade advance its unlock and produce no defenders.
- The provisional default is **automatic fire after unlocking**. A visible reload leads to a launch toward a dense eligible red concentration. The shot travels in a visible arc before applying a bounded splash to red strength in the simulation. Show recoil, a cluster breaking apart according to resolved losses, and the crew winding up the next shot. A completed reload can wait for a valid target. The art follows resolved impacts and the actual remaining horde.
- Artillery buys time and reduces pressure. The blue line still needs reinforcements to secure the supply route. Reuse Level 1's victory and defeat rules for the first prototype. If the supply route is already secured, a final artillery casualty can end the battle.
- **Ammunition alternative.** The cannon could periodically reload the crew by aiming at a supply target. That creates an ongoing choice and can curb an overpowered unlock, but adds another target state and asks the player to monitor reloads while switching among gates. Begin with automatic fire and test wood cost, reload cadence, splash, and exposure before testing an ammunition loop.

## Battlefield

Start with one crossing between a readable red mustering yard and a broad blue approach. Keep the starter gate central and stronger gates on recognizable side lanes. Place the catapult in a visible side emplacement with its own aim footprint and wood. Verify that a three-cat volley can distinguish that footprint from gate openings on an iPhone. The arcing shot should be visible above the crowd without covering the front or the gate labels. Red still enters from the far side through one supply route.

## Balance hypotheses

A player should be able to build a line, spend short bursts breaking the catapult wood, and return to reinforcement when pressure rises. Test a viable route that favors multipliers and one that unlocks artillery, including variation in unlock timing. Early all-in artillery, breaking every barricade before defending, and passive starter-gate fire are likely losses. Target roughly the feel of one Level 1 battle, then tune around actual replays. Simulate wood cost, first-shot delay, reload, target-window rules, splash reach and damage, enemy density, and gate value. Check for aim-through overlap, pre-stacked shots, duplicated impacts, and unattended artillery wins.

## Implementation considerations

Use the [minimal level foundation](../level-architecture.md#minimal-shared-design). Add a reusable direct-hit target, an unlockable support state, and deterministic selection and scheduling. Start with a target window derived from the logical battle. Use bounded splash effects and representative troops on Canvas. Add tests for paused reload without targets, once-only damage after flight, supply cutoff, final casualty, reset during flight, and mis-aims around the barricade. Run artillery-first and reinforcement-first strategies at all three test rates. Check touch target separation and use a muted, HUD-hidden replay to see whether players can tell what the catapult did.

## Open questions

Can players tell where to aim to free the crew and why unlocking it matters? Which emplacement keeps cannon aim clear? Should a launched ball stay fixed on its original window if the front moves, or should the window include a nearby moving cluster? How distinctive and useful is support without making it a required win switch? Would ammunition create a worthwhile decision after players learn the base version?

## Revision history

Initial Milestone 6 proposal. Automatic fire is the first prototype recommendation. Revisit it after Level 2 sessions recorded in the [playtest log](../playtest-log.md).
