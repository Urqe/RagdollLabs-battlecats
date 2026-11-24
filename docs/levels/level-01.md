# Level 1 · The Last Stand

[Roadmap](../roadmap.md)

## Identity

**Status** · Implemented. A small blue army defends a castle by alternating between reinforcing the frontline and opening stronger multiplication gates.

## Player experience

The opening teaches the rhythm of automatic fire. The main choice is when to trade a volley of defenders for direct damage to a barricade. Watch a small blue line give way, recover behind ×99, and finally pour into the red yard. Tiny soldiers and a miniature cannon play the siege straight.

## Mechanics

Sliding the cannon aims three automatic cat projectiles per volley. The open center ×20 multiplies shots immediately. The left ×99 and right ×999 require direct hits on their wood, with damage preserved across aim changes. Multiplied formations march before joining combat. Red recruits escalate, casualties reduce each side's pressure, and the frontline moves accordingly. Blue wins by securing the supply entrance and eliminating the remaining horde. Red wins by reaching the castle line. The last casualty starts a 1.5-second celebration.

## Battlefield

Three gates span the lower approach ahead of the cannon. A single stone crossing connects that approach to the wide red yard. Red enters from the far side until blue secures the marked supply entrance. No support units are present. The yard, crossing, and distinct gate rhythms make the pressure and final blue flood visible.

## Balance hypotheses

The measured baseline supports both balanced strategies, with about 96–97 seconds of combat. ×20-only defense, rushing barricades, and remaining on ×99 after unlocking lose. Keep reinforcement growth, gate timing, march delay, casualties, supply cutoff, and aim tolerance under regression coverage. Check early gate rushing and overlapping projectile hits when changing targeting. [Exact tuning and results](../level-1-balance.md)

## Implementation considerations

This level is the shared [architecture baseline](../level-architecture.md). Reuse automatic fire, collision, marching, and pressure rules. Preserve read-only browser snapshots, 30/60/120 Hz strategies, complete Chromium and WebKit playthroughs, and representative Canvas rendering. [Gameplay clips](../level-1-balance.md#recorded-motion)

## Open questions

First-time comprehension, fairness, human session length, and physical iPhone performance still need observation. [Playtest log](../playtest-log.md)

## Revision history

Merged milestones established modular simulation and CI, validated strategy outcomes, made escalating pressure readable, revised the final elimination and victory sequence, and added distinct combat motion and optional audio. [PR #1](https://github.com/Urqe/RagdollLabs-battlecats/pull/1) · [PR #2](https://github.com/Urqe/RagdollLabs-battlecats/pull/2) · [PR #3](https://github.com/Urqe/RagdollLabs-battlecats/pull/3) · [PR #4](https://github.com/Urqe/RagdollLabs-battlecats/pull/4) · [PR #5](https://github.com/Urqe/RagdollLabs-battlecats/pull/5)

## Army movement

A large force can march toward the red entrance while scattered arrivals continue. Cohorts merge into the occupied rear shoulder and fill the broad playable frontage. [Milestone 21](../living-armies.md)
