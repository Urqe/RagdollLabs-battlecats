import { clamp, rand } from "./config.js";
export function createMultipliers(state, sprinkle, notify) {
  function spawnSquad(g, fromX) {
    const count = g.mult;
    state.squads.push({
      x: clamp(fromX, 46, 374),
      y: 532,
      count,
      mult: g.mult,
      phase: rand(0, 6),
    });
    // Each squad remains in flight until it reaches the frontline.
    sprinkle(fromX, g.y - 10, g.color, 8);
    if (g.mult === 999 && !state.finalActivated) {
      state.finalActivated = true;
      notify("COUNTERATTACK! KEEP FIRING ×999!", 3);
    }
  }
  return { spawnSquad };
}
