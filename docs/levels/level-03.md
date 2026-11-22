# Level 3 · The Meowmen

[Roadmap](../roadmap.md)

## Identity

**Status** · Proposed. Unlock cat archers to deliver steady ranged support over a contested crossing.

## Player experience

Choose when to trade frontline volleys for a crew that pays off over a longer fight. Compared with the catapult's occasional splash, the visual reward is synchronized volleys and small repeated gaps ahead of the line. A tiny archer standing on a crate can sell the scale joke.

## Mechanics

Reuse auto-fire, wood, gates, and marching. Aim at the crew's barricade, then let the crew fire toward eligible red ranks. Use the established advances, supply cutoff, and castle breach rules as the starting objective. Test a steady horde that rewards sustained defense.

## Battlefield

One crossing and one far red entry. Keep the starter gate central and stronger gates reachable as before. Put archers on a side parapet with a distinct wooden target and keep arrow silhouettes clear of the cannon stream.

## Balance hypotheses

Alternate defense with an archer unlock when the line can absorb the cost. Rushing the crew or staying on the starter gate should be weak. Target a battle of similar length to Level 2. Simulate cadence, target range, and steady damage. Check for enemies being pinned before the line engages.

## Implementation considerations

Reuse Level 2's support lifecycle if it proves useful. Render small volley groups and cap arrow effects. Test range, shot resolution, normal objectives, and reset on mobile.

## Open questions

Does steady ranged support change the aim decision enough to deserve its own level? Would it work better as an alternative within a later combined level?

## Revision history

Initial Milestone 6 brief. Revisit after the [Purrapult playtests](../playtest-log.md).

## Milestone 14A simulation foundation

`ARCHER_SUPPORT` in `src/levels.js` is a provisional preset, not a playable
level. A controlled level can supply it as `support`, with a matching barricade;
existing projectile hits unlock it through the normal support lifecycle.
`kind: "archers"` selects aggregate arrow resolution instead of Purrapult splash.

Initial assumptions: six arrows × eight damage = 48 casualties per successful
volley, 0.2 seconds of flight, then 0.6 seconds of reload (60 damage/second).
The first launch waits one reload after unlock. Arrow count is clamped to 1–12.
Use positive finite reload/flight values and an integer arrow count in level data.
The preset's maximum damage rate is below even the starting red reinforcement
rate (150/second); it cannot overcome continuing reinforcements by itself.
These are conservative hypotheses for later playtesting, not final balance.

Aim is fixed at launch, 24 units behind the front, within the real army's
100-unit occupied band. Launch requires positive red population and a target
within 520 vertical units of the crew (x/y define the future launch origin).
At impact the aim must still be inside the current occupied band and range;
otherwise the whole volley misses. There is no splash coverage calculation,
individual target identity, or per-arrow physics. Damage is capped at remaining
red population, and only the ordinary army simulation moves the frontline.
No-target time does not bank volleys. Timing uses scheduled deadlines to avoid
frame-rate drift during normal 30/60/120 Hz updates; large time jumps are not a
combat replay facility. One volley can be in flight at a time.

The existing `onEffect(type, time, payload)` callback emits `archerLaunch` with
`x`, `y`, `originX`, `originY`, `arrows`, `launchedAt`, and `impactAt`. A renderer
can interpolate a bounded volley using those timestamps without a per-frame
flight event. `archerImpact` repeats those fields and adds `at` and actual `loss`,
including zero-loss misses. Payloads are snapshots. Reset/level switch replaces
support state; victory/defeat discards flight without a later impact event.
Rendering and archer-specific sound remain for the next milestone.
