# Codex working agreement — SiegeDolls

This file applies to repository work by coding agents. Keep it concise; use linked docs and source code as the authority for current behavior.

## Product guardrails

SiegeDolls is a mobile-first, one-finger Canvas arcade strategy game. The horizontal cannon automatically fires three kittens; players decide when to reinforce through ×20/×99/×999 gates versus spending shots on barricades or support unlocks. Preserve readable army growth, tactical consequences, playful miniature-cat presentation, quick replayability, and freedom to select any implemented level. No monetization, grinding, or extra controls without explicit scope.

The **simulation owns** populations, arrivals, casualties, pressure, frontline, artillery damage, and victory/defeat. The renderer may interpolate and dramatize these events but must not create combat-effective troops, fictional losses, teleporting reinforcements, or invisible enemies. Large armies use bounded representative sprites—not per-cat combat agents.

## Core gameplay vision — The Playable Advertisement

SiegeDolls delivers the spectacular army-multiplication fantasy advertised by casual mobile games such as Top Lords, with Mob Control as a useful mechanical reference. Build the **playable arcade battle shown in the ads**, not unrelated base-building, 4X, alliance, or resource-grinding systems.

**Core loop: Fire → Multiply → Reinforce → Overwhelm → Breakthrough → Victory.**

- **Numerical superiority must matter.** More active cats should normally mean greater fighting effectiveness and understandable battlefield progress, with smooth, terrain-sensitive diminishing returns rather than unexplained hard ceilings.
- **Major reinforcements must feel rewarding.** A large wave should visibly strengthen the formation: slow a retreat, stabilize the line, push the enemy back, or trigger a breakthrough.
- **Armies are living formations.** Fill useful frontage and side gaps, replace front-rank casualties from behind, and integrate reinforcements without teleporting or rigid block motion.
- **Readability before realism.** A player should recognize which army is winning, and why, by watching the battlefield—not by knowing hidden equations or counters.
- **Spectacular breakthroughs.** Overwhelming armies surge forward against negligible opposition; trickle reinforcements should not indefinitely halt a vastly superior force.
- **One-finger control, meaningful choices.** Keep decisions about cannon aim, multipliers, upgrades, and battlefield priorities; avoid additional micromanagement.
- **Special units add strategic opportunity.** Purrapult, Meowmen, Meowrtans, and future mechanics should create satisfying trade-offs, not compensate for unintuitive ordinary combat.

**Product priorities:** satisfying player feedback → readable cause and effect → organic army movement → simple tactical choices → deterministic, mobile-safe implementation → mathematical realism.

The authoritative simulation still owns troops, damage, reinforcement ownership, pressure, frontline movement and outcomes. The renderer may dramatize but must not fabricate effective troops, kills or territorial changes. **Explicitly authorized gameplay redesigns may change authoritative mechanics and balance** when necessary to achieve the arcade experience; presentation-only work may not. When balance is intentionally changed, revise tests and record matched before/after outcomes rather than preserving a frustrating old result.

Do not add base-building, 4X systems, alliances, hero inventories, equipment grinding, monetization, or unrelated progression without explicit scope.

## Combat presentation — Operation Flying Fur

**Combat outcomes are deterministic. Combat presentation is gloriously exaggerated.** SiegeDolls should look like joyful, chaotic slapstick warfare: flying, spinning, bouncing and stumbling miniature cats, rapid arrow storms, and spectacular Purrapult knockbacks. Prioritize readable cause and effect and satisfying visual payoff—not realism.

- **Presentation-only effects never change authoritative outcomes.** Visual effects must not modify populations, casualties, reinforcements, damage, frontline position, supply cutoff, balance, or win/loss. Visual reactions follow authoritative clash, archer-impact, and artillery-impact events. Do not synthesize combat damage or invisible tactical advantages.
- **Distinguish knockout from knockback.** A casualty may tumble and retire; a nonlethal reaction must visibly recover or return to formation without adding a soldier. Temporary flying representatives are not extra units, and presentation must not imply a permanent gap or territorial push that the simulation did not produce.
- **Distinct rhythms:** melee is continuous close-range slapstick with frequent small recoils and occasional dramatic launches; Purrapult impacts are infrequent, broad and explosive, sending multiple cats flying; Meowmen deliver rapid, widespread arrow volleys and repeated localized disruptions. Exaggerate motion, spatial spread and apparent activity, not authoritative kill counts.
- **Event-driven, not a second simulation.** Seed and animate bounded representative effects from real events; deterministic visual variation is preferred. Interpolate trajectories for presentation only. Scale effect strength with actual event intensity where sensible, while allowing nonlethal reactions. A miss must never depict a casualty.
- **Shared, lightweight effects.** Prefer one small reusable presentation primitive for airborne cats (velocity, gravity, spin, bounce, landing/retirement) over separate physics engines for melee, arrows and artillery. Do not simulate individual combatants or per-arrow collision physics.
- **Mobile readability and performance first.** Cap simultaneously active sprites, particles, embedded arrows and their lifetimes; prioritize major impacts when saturated. Avoid hiding the frontline, gates, cannon aim or danger warnings. Clear all transient effects on restart, level switch, victory and defeat. Tune budgets using mobile-emulated checks and physical iPhone playtests, not assumed device performance.

## Where to look

- `src/game.js`, `src/state.js`, `src/army.js`, `src/levels.js`: game loop, authoritative state, combat, and per-level data.
- `src/projectiles.js`, `src/multipliers.js`, `src/artillery.js`: cannon, gates, and support.
- `src/motion.js`, `src/army-visual.js`, `src/army-continuity.js`, `src/army-movement.js`, `src/formation-dynamics.js`, `src/figures.js`, `src/render.js`: presentation, formation handoffs, and drawing.
- `src/danger.js`: tactical danger forecast and warnings.
- `docs/roadmap.md`: product intent and proposed levels; `docs/level-architecture.md`: integration boundaries; `docs/levels/`: level briefs; `docs/level-1-balance.md`, `docs/purrapult-balance.md`, `docs/army-visual-scale.md`, `docs/playtest-log.md`: balance and evidence.

Inspect only the files relevant to the task first. Read more when a dependency requires it; do not routinely load the entire repository or all historical milestone evidence.

## Task scope and implementation

- Prefer focused PRs, normally one primary behavior or defect. Explicitly authorized cross-cutting gameplay redesigns may modify multiple shared systems when they serve one clear product objective and carry matched balance/regression evidence.
- Begin with a reproducible failure or observable gameplay shortcoming and specific acceptance criteria. Identify whether the root cause is simulation, presentation, or both before changing code.
- Prefer small changes to existing systems over parallel state machines, speculative abstractions, and broad refactors.
- Preserve stable representative slots, reinforcement handoffs, casualty continuity, mobile input, and victory choreography when touched.
- Maintain deterministic behavior across 30/60/120 Hz. When a task deliberately changes balance, record before/after outcomes rather than asserting old results are unchanged.
- Do not implement proposed future units or levels unless explicitly requested. Elite-unit concepts in the roadmap are not current implementation requirements.

## Validation budget

During development: run focused Node tests and a short targeted simulation. Before opening a PR: run `npm test`, relevant browser checks (`npm run test:browser` or a focused Playwright spec), and any explicitly applicable strategy comparisons. CI is the comprehensive gate (`npm run test:all`); don't repeatedly run the entire suite after trivial edits.

For **visible behavior** changes, capture one short continuous portrait gameplay example (and before/after evidence if fixing a visual regression). For **balance** changes, show a matched decision scenario and outcomes; for performance-sensitive rendering, include an appropriately scoped benchmark. Full-length multi-video suites should be requested only for major changes. Do not claim real iPhone performance from browser emulation.

Keep generated videos, traces, and verbose profiling output out of Git where possible; use CI/PR artifacts or links. Commit only small, review-useful evidence and concise documentation. Never delete existing evidence without an explicit housekeeping task.

## PR delivery

- Branch from current `main`; do not modify unrelated files.
- State: the observed issue, root cause, behavior changed, main trade-off, exact tests run/results, and any limits (especially physical-device testing).
- Update relevant docs only; don't rewrite roadmap or historical balance documents gratuitously.
- Open a PR with a focused diff. **Do not auto-merge**; human review and CI determine acceptance.
- After merge, physical iPhone playtesting is the product-experience gate; if it uncovers a regression, handle it as a new focused task.

**Priority:** satisfying, understandable player decisions and stable mobile gameplay over technical spectacle or test-count inflation.
