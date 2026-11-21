# Level 6 · The Clawlossus

[Roadmap](../roadmap.md)

## Identity

**Status** · Proposed. A moving red siege tower tempts the player to divert direct fire while the horde keeps pushing.

## Player experience

Decide when to concentrate cannon fire on a visible tower and when to rebuild the line. The payoff is visible structural damage and a collapse that relieves pressure. Tiny red cats straining to push it supply the humor.

## Mechanics

Reuse gates, wood collision, marching, and the single frontline. Prototype a hittable tower with one clearly signaled effect on nearby pressure or breach risk. Shoot it directly between reinforcement bursts. Start with zero remaining attackers after securing supply and a castle breach as the loss condition. Treat a surviving tower as a threat to resolve within that objective.

## Battlefield

Keep one crossing and a separate visible tower approach that intersects a clear cannon aim window. Use normal starter and upgrade gate lanes. Include a support position only if it helps the decision. Red troops and the tower come from the far yard.

## Balance hypotheses

Alternate short tower bursts with defense. Chasing it continuously or ignoring it under pressure should carry a cost. Target one readable tower encounter in a short battle. Simulate travel speed, hit windows, durability, and its pressure effect. Check for free tower hits through gates or blocked shots registering twice.

## Implementation considerations

Build on direct-hit target ordering and simulation-owned effects. Render bounded debris and clear damage stages. Test moving intersections, a destroyed tower, and reset at mobile viewport sizes.

## Open questions

Is the tower a threat the player can postpone or a decisive priority? What benefit does it give red that is visible on a phone?

## Revision history

Initial Milestone 6 brief. Revisit after testing support targets and the readability of armor or other special threats.
