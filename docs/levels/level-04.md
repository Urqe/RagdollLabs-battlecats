# Level 4 · A Tale of Two Tails

[Roadmap](../roadmap.md)

## Identity

**Status** · Development fixture. Hold two crossings with one sliding, auto-firing cannon.

## Player experience

The new decision is where to reinforce as pressure alternates across the screen. A viewer should see one crossing sag while the other recovers. Matching watchposts with rival cat banners provide a small visual gag.

## Mechanics

Reuse auto-fire, gates, wood, and arrivals. Aim at a lane's gate or optional upgrade target. Red pressure and blue routing would be tracked per approach. Prototype victory after securing both supply routes and eliminating the horde. Prototype defeat on either breach and test whether that rule feels fair.

## Battlefield

Two short crossings lead to a shared castle view. Give each a legible starter lane and consider one optional stronger gate per approach. Red enters from two visible sides. Leave support crews out of the first test to isolate the choice between lanes.

## Balance hypotheses

Move fire between crossings as threats change. Camping one lane should lose the other. Aim for a compact battle with room to recover. Simulate lane demand, march distances, and switching tolerance. Check whether a gate border feeds both lanes cheaply.

## Implementation considerations

Requires readable routing, independent lane pressure and breaches, compact units and alerts, and a second-lane budget. Test isolated and simultaneous threats with native mobile-size input.

## Open questions

Can players tell which crossing needs help while sliding? Would staggered pressure or a shared breach buffer make mistakes fairer?

## Play the 17B fixture

Run `npm run dev` and open `http://127.0.0.1:4173/?fixture=dual-crossing`. Use
**Defend the castle** to start. Slide toward an inner ×20 gate for immediate
reinforcements, or aim at the outer ×65 barricade to open the stronger gate.
The arrows on each contact line show the direction of movement. An amber
crossing and downward warning mark enemies approaching the castle.

For a quick warning and defeat, hold the starting west aim. To exercise both
upgrades and see victory, start on the west barricade and alternate between
the outer gates about every three seconds. **Pause → Restart** resets both
crossings. **Levels** leaves the fixture. Level 4 remains unavailable in
the normal selector.

Fixture gate values, populations, and timing are provisional. Milestone 17C
covers final balance, public selection, and progression.

## Revision history

Initial Milestone 6 brief. Validate the single-front support levels before scheduling this prototype.
