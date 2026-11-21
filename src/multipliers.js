import { clamp, GATE_HIT_Y, LEVEL } from "./config.js";

export function createMultipliers(state, sprinkle, random = Math.random) {
  function spawnSquad(g, fromX, entryY = GATE_HIT_Y, slot = 0) {
    state.squads.push({
      x: clamp(fromX, 46, 374),
      y: LEVEL.spawnY,
      entryY,
      slot,
      count: g.mult,
      mult: g.mult,
      phase: random() * 6,
      marchTime: 0,
    });
    sprinkle(fromX, entryY - 5, g.color, g.mult === 999 ? 7 : 3);
  }
  return { spawnSquad };
}
