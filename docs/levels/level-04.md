# Level 4 · A Tale of Two Tails

[Roadmap](../roadmap.md) · [Balance evidence](../level-4-balance.md)

**Status** · Implemented. Choose **A Tale of Two Tails** from the level menu.
All four implemented levels are immediately available.

## Hold both crossings

Two red invasion routes lead from separate supply camps on the north bank.
Their west and east bridges cross the same river. On the south bank, both
roads open onto the approach to one blue castle, with a single curtain wall,
central gatehouse and shared cannon courtyard. Each crossing keeps its own
combat front, army counts, reinforcement gates and breach warning.

The cannon slides horizontally and fires three kittens automatically every
0.46 seconds. Aim at the inner ×20 gates for immediate reinforcements. An
outer ×60 gate opens after its barricade takes 42 direct hits, or 14 clean
volleys. Each kitten follows its own shot path. At the center seam the two
outer shots in a volley can feed opposite crossings while the center shot
misses. The level has no support emplacements.

The directional marks on each frontline show which way it is moving. When
a crossing nears the castle, an amber warning marks the endangered side.
The warning turns red in breach range and clears after the frontline pushes
back far enough. A gate displays its barricade progress or **Open**. Each
camp has one marked supply point. Its label reports the cutoff while its flag
marks control of the camp.

## Win and lose

Advance both lines to their enemy entrances to permanently cut supplies.
Victory requires both entrances secured and zero red troops on both
crossings. Combat freezes at that point. Leading blue ranks charge first,
the following ranks close up, and each army reaches its camp's flagpole.
Each red flag drops and a blue flag rises at the same pole. Both blue flags
are up before the victory result appears at 3.2 seconds.

If either red army reaches the castle, both crossings freeze. A
0.85-second reaction highlights the breached side before the defeat
result. If both cross on the same tick, both are named. Pause freezes
combat and both outcome sequences. Restart resets the entire battle.

## Playtest focus

Five-second alternation between starter gates is a reliable first plan in
the deterministic replay. One stronger gate can help a crossing recover,
but continuous fire against wood leaves the opposite crossing exposed.
Physical iPhone frame pacing and human switching tolerance remain open.
