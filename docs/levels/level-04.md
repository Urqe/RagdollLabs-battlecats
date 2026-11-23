# Level 4 · A Tale of Two Tails

[Roadmap](../roadmap.md) · [Balance evidence](../level-4-balance.md)

**Status** · Implemented. Choose **A Tale of Two Tails** from the level menu.
All four implemented levels are immediately available.

## Hold both crossings

The cannon slides horizontally and fires three kittens automatically every
0.46 seconds. Aim at the inner ×20 gates for immediate reinforcements. An
outer ×60 gate opens after its barricade takes 42 direct hits, or 14 clean
volleys. Each kitten follows its own shot path. At the center seam the two
outer shots in a volley can feed opposite crossings while the center shot
misses. The level has no support emplacements.

The directional marks on each frontline show which way it is moving. When
a crossing nears the castle, an amber warning marks the endangered side.
The warning turns red in breach range and clears after the frontline pushes
back far enough. A gate displays its barricade progress or **Open**. Supply
flags and labels show which enemy entrances are secured.

## Win and lose

Advance both lines to their enemy entrances to permanently cut supplies.
Victory requires both entrances secured and zero red troops on both
crossings. Combat freezes at that point. Leading blue ranks charge first,
the following ranks close up, and each entrance raises its own blue flag.
The victory result appears after the 3.2-second sequence.

If either red army reaches the castle, both crossings freeze. A
0.85-second reaction highlights the breached side before the defeat
result. If both cross on the same tick, both are named. Pause freezes
combat and both outcome sequences. Restart resets the entire battle.

## Playtest focus

Five-second alternation between starter gates is a reliable first plan in
the deterministic replay. One stronger gate can help a crossing recover,
but continuous fire against wood leaves the opposite crossing exposed.
Physical iPhone frame pacing and human switching tolerance remain open.
