import { barrierIndex, hitBarricade } from "./barricades.js";
import { activateArtillery } from "./artillery.js";

export function updateProjectiles(
  state,
  dt,
  spawnSquad,
  sprinkle,
  notify,
  onEffect = null,
) {
  const { level, shots, gates, support } = state;
  const emplacement = level.support;
  for (let j = shots.length - 1; j >= 0; j--) {
    const shot = shots[j];
    const previousY = shot.y;
    shot.y -= level.combat.projectileSpeed * dt;
    let surface = null;
    let index = -1;
    let hitY = -Infinity;
    for (const gate of gates) {
      if (Math.abs(shot.x - gate.x) > gate.width / 2) continue;
      const slot = gate.open ? -1 : barrierIndex(state, gate.barricadeId);
      const y = gate.open ? gate.hitY : level.barricades[slot].hitY;
      // Sibling shots between the two planes can follow a newly opened gate.
      if (y > hitY && shot.y < y && (gate.open || previousY >= y)) {
        surface = gate;
        index = slot;
        hitY = y;
      }
    }

    if (
      support &&
      !support.open &&
      Math.abs(shot.x - emplacement.x) <= emplacement.width / 2
    ) {
      const slot = barrierIndex(state, emplacement.barricadeId);
      const y = level.barricades[slot].hitY;
      if (y > hitY && shot.y < y && previousY >= y) {
        surface = support;
        index = slot;
        hitY = y;
      }
    }

    if (!surface) {
      if (shot.y < level.battlefield.shotEndY) shots.splice(j, 1);
      continue;
    }
    shots.splice(j, 1);
    if (surface.open) {
      spawnSquad(surface, shot.x, Math.min(previousY, hitY), shot.slot);
    } else {
      hitBarricade(
        state,
        index,
        surface,
        surface === support ? emplacement.x : surface.x,
        shot,
        sprinkle,
        notify,
      );
      if (surface === support && surface.open) activateArtillery(state);
      onEffect?.(surface.open ? "break" : "wood", state.t);
    }
  }
}
export function fire(state, sprinkle) {
  const { shotY } = state.level.battlefield;
  for (let i = -1; i <= 1; i++)
    state.shots.push({ x: state.gunX + i * 9, y: shotY, slot: i });
  state.recoil = 1;
  sprinkle(state.gunX, shotY + 7, "#c7f5ff", 3);
}
