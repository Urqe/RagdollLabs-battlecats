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
| Rendering | Both levels share the same logical viewport and one-crossing terrain. The definitions specify aim footprints and both render and collision use their barricade IDs and hit planes. Sprite, terrain, and motion caches remain shared. The catapult adds a bounded layer only when present. |

## Validation and extension

Level 1's [committed results](level-1-balance.md#deterministic-results) and both browser engines anchor the refactor. Its strategy JSON remains byte-identical at 30, 60, and 120 Hz. Keep count, travel, unlock, and victory regression tests as more data moves into definitions. [Level 2 results and media](purrapult-balance.md)

To make another level playable, provide a complete definition and mark its registry entry implemented. Let the existing selector expose it. Add a new simulation rule only when the level needs one. Test a deterministic set of aim strategies, normal menu entry and replay, isolation on switching, a representative win and loss, and the shared mobile input.

Both shipped levels currently use a single front and representative aggregate troops. Multiple fronts, independently modeled cohorts, or a different objective would need a concrete level brief and tests before extending these boundaries. Validate whether Level 2's support lifecycle should be shared with archer support during the next playtest review.
