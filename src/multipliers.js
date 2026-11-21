import { clamp, LEVEL } from "./config.js";
export function createMultipliers(
  state,
  sprinkle,
  notify,
  random = Math.random,
) {
  function spawnSquad(g, fromX) {
    const count = g.mult;
    state.squads.push({
      x: clamp(fromX, 46, 374),
      y: LEVEL.spawnY,
      count,
      mult: g.mult,
      phase: random() * 6,
      marchTime: 0,
    });
    // Each squad remains in flight until it reaches the frontline.
    sprinkle(fromX, g.y - 10, g.color, 8);
  }
  return { spawnSquad };
}
