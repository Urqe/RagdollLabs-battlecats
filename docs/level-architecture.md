# Level architecture

[Roadmap](roadmap.md) · [Level 1](levels/level-01.md) · [Level 2](levels/level-02.md)

## Implemented boundaries

| Area | Implementation |
| --- | --- |
| Definitions | [The registry](../src/levels.js) holds stable IDs, title, number, and status. Each playable definition has battlefield settings, gates, wood, escalation and combat values, an objective, and optionally a support emplacement. The eight remaining entries carry menu metadata. |
| Shared battle | [Game](../src/game.js) and [state](../src/state.js) build fresh runtime data from the level. The selected definition supplies movement, collision, marching, combat, supply cutoff and castle breach parameters. Restart preserves the selected definition. Returning to the selector stops the animation loop and clears the battle. |
| Cannon and targets | [Controls](../src/controls.js) bind once. [Projectile collision](../src/projectiles.js) finds the closest crossed surface and consumes a shot once. Gate and support targets reference wood by ID. This preserves multiplicative crossings and sibling volleys opening a gate mid-flight. |
| Artillery | [Artillery](../src/artillery.js) owns unlock, reload, target selection, flight, and once-only casualties. [Canvas effects](../src/artillery-render.js) draw the crew, trajectory, and resolved impact from those states. |
| UI and progress | [The browser shell](../src/main.js) builds the selector and barrier HUD from the active data. Every implemented level is available immediately. The battle's **Levels** button sits outside the play surface. [Local progress](../src/progress.js) stores the last playable ID and completed IDs as an informational record. Unknown IDs, unsupported versions, corrupt data, and unavailable storage fall back to playable defaults. Sound has its own preference and live battle state stays in memory. |
| Rendering | Both levels share the same logical viewport and one-crossing terrain. The definitions specify aim footprints and both render and collision use their barricade IDs and hit planes. Sprite, terrain, and motion caches remain shared. [Motion](../src/motion.js) keeps one recent successful impact with its simulation coordinates and casualty count. [Formation feedback](../src/formation.js) offsets existing draw slots while the [Canvas impact layer](../src/artillery-render.js) reuses up to 13 airborne cat sprites. The app clears impact and frontline motion state when restarting or changing levels. Both teams use [the same population curve](army-visual-scale.md) with individual fighting ranks and cached reserve tiles. [Army continuity](army-visual-scale.md#milestone-10--army-continuity) keeps fractional living budgets, fixed reserve-band slots and a separate short-lived fallen extent. The battle state and outcome timer remain authoritative. [Army movement](army-visual-scale.md#milestone-11--reinforcement-movement-and-victory-advance) adds bounded wave-to-slot handoffs and a victory position derived from the frozen battle front and the existing celebration clock. |

## Validation and extension

Level 1's [committed results](level-1-balance.md#deterministic-results) and both browser engines anchor the refactor. Its strategy JSON remains byte-identical at 30, 60, and 120 Hz. Keep count, travel, unlock, and victory regression tests as more data moves into definitions. [Level 2 results and media](purrapult-balance.md)

To make another level playable, provide a complete definition and mark its registry entry implemented. Let the existing selector expose it. Add a new simulation rule only when the level needs one. Test a deterministic set of aim strategies, normal menu entry and replay, isolation on switching, a representative win and loss, and the shared mobile input.

Both shipped levels currently use a single front and representative aggregate troops. Multiple fronts, independently modeled cohorts, or a different objective would need a concrete level brief and tests before extending these boundaries. Validate whether Level 2's support lifecycle should be shared with archer support during the next playtest review.

Milestone 12 formation dynamics live in the presentation path. [Motion](../src/motion.js) samples the authoritative line and consumes existing arrival and clash events. [Formation dynamics](../src/formation-dynamics.js) resolves the depth anchors, packing and local pressure, and [figures](../src/figures.js) uses them in the shared slot layout. Both level starts seed the anchors from the starting line, and restart or level selection clears the motion state. The renderer uses the displaced receiving band for the existing handoff and releases the combat deformation into the existing victory advance. [Model and rendering evidence](army-visual-scale.md#milestone-12--formation-dynamics-and-battlefield-momentum)

## Aggregate combat extension points

Casualty rates, territorial pressure, and the temporary contact presentation
are separate calculations. Future elite troops can extend the aggregate
inputs along four independent dimensions.

| Property | Possible extension |
| --- | --- |
| Attack effectiveness | Weight the contribution of each unit class to the attacks available within the engagement budget. |
| Defensive resilience | Apportion incoming losses across the engaged classes by exposure and resilience. |
| Push strength | Weight how much each formation contributes to the pressure difference that moves the frontline. |
| Formation stability | Tune resistance to displacement, retreat compression, and how quickly the supporting ranks close gaps. |

A future implementation can aggregate by class at the line with the same
simulation and event flow. Keep unit quantity relevant to engagement
capacity and endurance, even with higher quality per cat. Gates should
remain the source of reinforcements. No class attributes are needed in
the two current levels.

## Milestone 17A · Headless dual-front simulation

[The dual-front coordinator](../src/dual-front.js) takes exactly two crossing
definitions keyed by `left` and `right`. Each specifies `combat`, `objective`,
`marchSpeed`, and optionally `initialBlue` (default zero). These inputs use
the existing combat and objective fields, with independent starting populations,
reinforcement rates, growth and caps, march distances, cutoff points, and breach
thresholds. Each crossing owns aggregate blue and red populations, a frontline,
pending blue squads, red supply, and breach status. Balance and map geometry
remain open for [Level 4](levels/level-04.md).

The coordinator and the existing game share the [60 Hz clock](../src/battle-clock.js)
and [lane calculations](../src/lane-combat.js). The coordinator advances left
then right once per tick with a common timestamp. Each lane resolves marching
arrivals in launch order, continuous red arrivals, casualties, territorial
movement, and supply and breach checks. Enemy supply stays closed once cut.
After both lanes finish, either breach causes defeat. Victory requires both
supply routes closed and both red populations at zero. Either result freezes
the authoritative battle immediately.

`launchVolley(laneId, { multiplier, hits })` is the boundary for future cannon
targeting. It represents a resolved volley through an open gate. Each landed
kitten contributes the gate multiplier, and one to three landed kittens
(default three) form one marching squad for the chosen crossing. Aiming code
calls this once per resolved volley. It supplies the crossing and gate result
without relying on screen coordinates in the simulation. Call commands at
matching simulation boundaries for deterministic replays.

An optional `onEvent(event)` observer receives records with `type`, `laneId`
and simulation `time` in seconds. Blue `launch` and `arrival` records share a
squad ID, count, multiplier and hit count. Red `arrival` records report the
aggregate count admitted that tick. `casualties` and `clash` carry losses
and the contact position. `frontline` carries previous and current positions
so consumers can detect reversals. `supplyCutoff` and `breach` identify the
crossing and position. Launch events are immediate, and tick events publish
after both lanes and the outcome are updated. Observers can batch the tick
events for presentation.

`reset()` rebuilds both lanes and clears the clock remainder, squad IDs, and
outcome. `reset(definitions)` starts with new crossing definitions. A host
switching away calls `clear()` to discard both lanes and stop advancing the
battle. The shipped game keeps its single-front state, effect signatures, and
outcome choreography. Milestone 17B can bind the coordinator to input and
presentation once geometry and targeting are defined.
