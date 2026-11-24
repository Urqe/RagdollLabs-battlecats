# Level architecture

[Roadmap](roadmap.md) · [Level 1](levels/level-01.md) · [Level 2](levels/level-02.md)

## Implemented boundaries

| Area | Implementation |
| --- | --- |
| Definitions | [The registry](../src/levels.js) holds stable IDs, title, number, and status. Each playable definition has battlefield settings, gates, wood, escalation and combat values, an objective, and optionally a support emplacement. The six remaining entries carry menu metadata. |
| Shared battle | [Game](../src/game.js) and [state](../src/state.js) build fresh runtime data from the level. The selected definition supplies movement, collision, marching, combat, supply cutoff and castle breach parameters. Restart preserves the selected definition. Returning to the selector stops the animation loop and clears the battle. |
| Cannon and targets | [Controls](../src/controls.js) bind once. [Projectile collision](../src/projectiles.js) finds the closest crossed surface and consumes a shot once. Gate and support targets reference wood by ID. This preserves multiplicative crossings and sibling volleys opening a gate mid-flight. |
| Artillery | [Artillery](../src/artillery.js) owns unlock, reload, target selection, flight, and once-only casualties. [Canvas effects](../src/artillery-render.js) draw the crew, trajectory, and resolved impact from those states. |
| UI and progress | [The browser shell](../src/main.js) builds the selector and barrier HUD from the active data. Every implemented level is available immediately. The battle's **Levels** button sits outside the play surface. [Local progress](../src/progress.js) stores the last playable ID and completed IDs as an informational record. Unknown IDs, unsupported versions, corrupt data, and unavailable storage fall back to playable defaults. Sound has its own preference and live battle state stays in memory. |
| Rendering | Levels 1–3 share the same logical viewport and one-crossing terrain. The definitions specify aim footprints and both render and collision use their barricade IDs and hit planes. Sprite, terrain, and motion caches remain shared. [Motion](../src/motion.js) keeps one recent successful impact with its simulation coordinates and casualty count. [Formation feedback](../src/formation.js) offsets existing draw slots while the [Canvas impact layer](../src/artillery-render.js) reuses up to 13 airborne cat sprites. The app clears impact and frontline motion state when restarting or changing levels. Both teams use [the same population curve](army-visual-scale.md) with individual fighting ranks and cached reserve tiles. [Army continuity](army-visual-scale.md#milestone-10--army-continuity) keeps fractional living budgets, fixed reserve-band slots and a separate short-lived fallen extent. The battle state and outcome timer remain authoritative. [Army movement](army-visual-scale.md#milestone-11--reinforcement-movement-and-victory-advance) adds bounded wave-to-slot handoffs and a victory position derived from the frozen battle front and the existing celebration clock. |

## Validation and extension

Level 1's [committed results](level-1-balance.md#deterministic-results) and both browser engines anchor the refactor. Its strategy JSON remains byte-identical at 30, 60, and 120 Hz. Keep count, travel, unlock, and victory regression tests as more data moves into definitions. [Level 2 results and media](purrapult-balance.md)

To make another level playable, provide a complete definition and mark its registry entry implemented. Let the existing selector expose it. Add a new simulation rule only when the level needs one. Test a deterministic set of aim strategies, normal menu entry and replay, isolation on switching, a representative win and loss, and the shared mobile input.

Levels 1–3 use a single front and representative aggregate troops. Level 4 uses the dual-front coordinator and the same logical viewport.

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
remain the source of reinforcements. The implemented levels use aggregate cat populations.

## Milestone 17A · Headless dual-front baseline

[The dual-front coordinator](../src/dual-front.js) takes exactly two crossing
definitions keyed by `left` and `right`. Each specifies `combat`, `objective`,
`marchSpeed`, and optionally `initialBlue` (default zero). These inputs use
the existing combat and objective fields, with independent starting populations,
reinforcement rates, growth and caps, march distances, cutoff points, and breach
thresholds. Each crossing owns aggregate blue and red populations, a frontline,
pending blue squads, red supply, and breach status. Balance and map geometry
were defined for the public release in Milestone 17C.

The coordinator and the existing game share the [60 Hz clock](../src/battle-clock.js)
and [lane calculations](../src/lane-combat.js). The coordinator advances left
then right once per tick with a common timestamp. Each lane resolves marching
arrivals in launch order, continuous red arrivals, casualties, territorial
movement, and supply and breach checks. Enemy supply stays closed once cut.
In the baseline, after both lanes finish, either breach causes defeat. Victory requires both
supply routes closed and both red populations at zero. Either result freezes
the authoritative battle immediately.

`launchVolley(laneId, { multiplier, hits })` is the boundary for future cannon
targeting. It represents a resolved volley through an open gate. Each landed
kitten contributes the gate multiplier, and one to three landed kittens
(default three) form one marching squad for the chosen crossing. Each call supplies the crossing and gate result
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

## Milestone 17B · Playable dual-crossing baseline

The browser fixture uses the existing Canvas, pointer controls, battle shell,
and animation loop. Its active clock is the coordinator's 60 Hz battle clock.
The cannon and projectile collision run before lane combat in each tick.
Presentation consumes the emitted events and updates lane feedback after combat.
Levels 1–3 continue through the single-front game and renderer.

The fixture uses the shared three-shot spread and projectile resolver. Each
projectile keeps its launch X in flight. A hit on an open gate calls
`launchVolley(gate.laneId, { multiplier, hits: 1, origin })` with the gate's
owner and the projectile's X for the marching visualization. Hits on closed
wood spend that projectile on the barricade. Shots in the gaps expire. A
centered volley can feed both crossings through two distinct projectile hits.

The dual renderer draws a cached 420 × 760 map and compact ranks from the two
authoritative populations. Each crossing has its own contact line, supply
flags, marching squads, and warning. Casualties feed a bounded pool of four
airborne cats per lane. Continuous red arrivals accumulate in a short bucket
that drives the entrance animation. The fixture reuses replay, pause, and
level navigation. The 17C release uses the same battlefield through the normal level selector.

## Milestone 17C · Historical Level 4 release

`LEVEL_FOUR` registers `two-tails` as an implemented level. Its data owns
the four gate footprints, opening cost, and both crossing definitions.
The browser shell selects the corresponding renderer and battle clock when
the player starts that registry entry. The usual progress record stores
selection and completion. The same start path handles replay and restart.

On either outcome, the coordinator stops advancing populations, frontlines,
marches, and projectiles. Its existing fixed-step clock continues to drive
only the outcome presentation. Victory is recorded when both supplies
are secured and both red populations reach zero. The dual renderer uses
the shared rank-advance and flag timing primitives to render both charges
from their frozen frontlines before the result at 3.2 seconds. Defeat runs
a 0.85-second breached-crossing reaction before the normal overlay. The
shared pause controls freeze both clocks through visibility changes and
resume on a new wall-clock baseline. Leaving the level discards both lanes
and the presentation timers.

[Level 4 rules](levels/level-04.md) · [Symmetric release balance](level-4-balance-m17.md)

## Milestone 18 · One castle siege

[Level 4](levels/level-04.md) still uses the dual-front coordinator and fixed-step lane
calculations. The shared projectile resolver recognizes the Level 4
phalanx barricade as a target that consumes shots while locked. The
last hit sets the coordinator's phalanx phase to unlocked. Marching
and deploying advance on the same clock as combat and a west breach
can still end either phase. Only secured switches west combat to the
shield wall rule. The wall drives the contact line toward the bridge,
stops enemy advancement and ordinary melee losses, and admits red
arrivals into available space at the choke. That local hold keeps the
red entry open. The right continues ordinary lane combat.

The siege outcome checks both breaches first. When the east command
camp is cut off and the east population reaches a permanent zero, the
remaining west population transfers into an explicit retreat record.
The battle freezes population changes and emits the retreat separately
from casualty events. The outcome clock drives a single flag capture,
the withdrawal, and the shield salute. Restart and level selection
clear both the formation lifecycle and the retreat record.

The renderer caches the map and draws one red total from disjoint lane
populations. Bounded shared reserve ranks and lane contact formations
represent that total. The Meowrtans are a fixed ten-sprite formation
driven by authoritative phase and position. The east ×999 uses the
same reinforcement squads with denser bounded presentation. The
[balance tests](level-4-balance.md) cover eight pointer strategies and
use frontline bounds to verify the west breach occurs before the
earliest possible ordinary east victory.

## Milestone 19A · Connected siege simulation fixture

Run `node scripts/simulate-dual.js --connected` for the connected model.
The headless fixture opts in through `createDualBattlefield({ state, connected: true, onEvent })`.
It uses the existing cannon and projectile resolver, including the six
targets and their opening costs. The menu uses the released Milestone 18
simulation and Canvas.

[The connected siege coordinator](../src/connected-siege.js) uses two
contested lanes on the existing 60 Hz clock. Logical waypoints join the
castle entry, rear junction and branch approaches. The east's combat
front supplies progress from the starting contact to the command cutoff.
Routes outside active combat use leg distances and a fixed unit speed.
Pending squads, active lane populations, west transfers and the flanking
formation each own their blue troops. The Meowrtans are a separate
capability with no ordinary blue population. Red arrivals use the released
escalation curves. West admits them into available space at the wall and
retains any force that was already larger than that space.

The west remains vulnerable throughout the march and deployment. When
secured, the wall takes its fixed hold position and the west infantry
starts a 2.63-second withdrawal via the west rally and rear junction.
West-bound squads already marching continue to the rally before starting
their 2.25-second transfer. Later west gate hits launch genuine recruits
through the castle entry to the east. All cohorts enter combat only on
arrival. Shield impacts and spear thrusts occur at most once per 0.4 s.
Every fifth impact can be a surge under high pressure. A shield impact's
`repelled` and `intensity` describe nonlethal reactions. Use the
`casualties` stream to count combat losses.

Main breakthrough requires the secured wall, east supply cutoff and
zero surviving east reds. It closes the shared red supply, then commits
60% of the available east blue troops (rounded down) to the ridge pass
and leaves the balance in the east. The flank takes about 4.88 seconds
to reach the west rear. It exchanges casualties with the remaining reds
using the shared casualty calculation and a larger rear frontage cap.
A rout requires rear-inflicted losses of at least one quarter of the
force present on flank arrival and a surviving blue flank at least
twice the size of the remaining reds. Routed reds are recorded separately
from casualties. Victory follows the rear battle once resistance reaches
zero through casualties or a rout.

### Event handoff for 19B

| Event | Presentation data |
| --- | --- |
| `phalanxUnlocked`, `phalanxMarching`, `phalanxDeploying`, `phalanxSecured` | Phase and west front position |
| `launch`, `arrival` | Squad identity, original gate lane, actual assignment, route and count for blue. Count and front for red. |
| `infantryWithdrawal`, `transferProgress`, `transferArrival` | Stable cohort ID, count, route, departure time, leg, logical distance and normalized leg progress |
| `shieldImpact`, `spearThrust` | Fixed west front and impact intensity. Shield impacts carry surge and repelled counts. Spear thrusts refer to the same red losses recorded by the accompanying casualty event. |
| `mainBreakthrough` | East command waypoint, front and available infantry before flank assignment |
| `encirclementStarted`, `encirclementProgress`, `encirclementArrival` | Flanking cohort and route data on departure, at the ridge pass and on arrival |
| `rearAttack`, `enemyRouted`, `victory` | Rear waypoint, attack losses and remaining flank size, routed survivor count, and terminal victory |

Each event has the simulation time and a lane ID. A route snapshot's
`from` and `to` name the current leg. Between waypoint events, advance
visual distance from the departure timestamp and configured speed.
`launch` carries the initial route, leg, and distance. Blue transfer
arrival uses `transferArrival` once. Tick events are delivered after
combat and ownership are updated. Commands such as launch and unlock
emit as they are resolved. Pause freezes all travel and combat. Reset
and clear discard both lanes, outstanding cohorts and the flank.

### Matched cannon replays

| Strategy | Released result | Connected result | Connected main breakthrough |
| --- | ---: | ---: | ---: |
| Flank-first with ×999 | Win at 109.3 s | Win at 105.0 s | 96.3 s |
| Mixed with ×999 | Win at 93.3 s | Win at 115.9 s | 99.3 s |
| Mixed with ×99 after securing west | Win at 103.9 s | Win at 121.7 s | 105.2 s |

The connected routes change when recruits reach each branch and when
the aim strategy reacts to east pressure. In mixed, 1,758 ordinary west
infantry depart and the west force is already above the wall's intake
cap when the shields lock. The rear attack therefore has more reds to
fight. It inflicts about 1,624 casualties before routing about 4,698
survivors. The connected ×999 opening saves 5.9 s in the matched mixed
comparison and roughly 10.7 s in flank-first. These replays use the
existing gate economy and pre-deployment combat. Milestone 19C owns
further balance work. [Released balance](level-4-balance.md)

## Milestone 19B · Connected siege presentation

Open `/?fixture=connected-siege` and select Level 4 to run the presentation
fixture. The ordinary selector continues to use the released battlefield.
The fixture shares the cannon, gates, result clock and input handlers with
the release. Its scene, troop motion, shield animation and combat effects
read the connected simulation's lane populations, route cohorts and events.
Pause and resume use the battle clock, and the scene clears on restart and
level switching. [Gap analysis, rendering details and evidence](level-4-presentation.md)
