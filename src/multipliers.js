import { clamp } from "./config.js";

export function createMultipliers(state, sprinkle, random = Math.random) {
  function spawnSquad(g, fromX, entryY = g.hitY, slot = 0) {
    state.squads.push({
      x: clamp(
        fromX,
        state.level.battlefield.minX + 1,
        state.level.battlefield.maxX - 1,
      ),
      y: state.level.combat.spawnY,
      entryY,
      slot,
      count: g.mult,
      mult: g.mult,
      phase: random() * 6,
      marchTime: 0,
    });
    sprinkle(
      fromX,
      entryY - 5,
      g.color,
      g.mult === 999 ? 5 : g.mult === 99 ? 3 : 1,
    );
  }
  return { spawnSquad };
}
