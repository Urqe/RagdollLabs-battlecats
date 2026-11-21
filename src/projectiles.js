import { BARRICADE_HIT_Y, GATE_HIT_Y } from "./config.js";
import { hitBarricade } from "./barricades.js";
export function updateProjectiles(state, dt, spawnSquad, sprinkle, notify) {
  for (let j = state.shots.length - 1; j >= 0; j--) {
    const shot = state.shots[j],
      previousY = shot.y;
    shot.y -= 315 * dt;
    const gateIndex = state.gates.findIndex(
      (g) => Math.abs(shot.x - g.x) <= g.width / 2,
    );
    if (gateIndex < 0) {
      if (shot.y < 510) state.shots.splice(j, 1);
      continue;
    }
    const gate = state.gates[gateIndex];
    // Only a cannon projectile crossing a visible barrier damages it.
    // Neither allied soldiers nor a timer can alter barricade integrity.
    const hitY = gate.open ? GATE_HIT_Y : BARRICADE_HIT_Y;
    if (!(previousY >= hitY && shot.y < hitY)) continue;
    state.shots.splice(j, 1);
    if (gate.open) {
      spawnSquad(gate, shot.x);
      continue;
    }
    hitBarricade(state, gateIndex, shot, sprinkle, notify);
  }
}
export function fire(state, sprinkle) {
  // Three physical cats fly up the lane. A gate multiplies each one on contact.
  for (let i = -1; i <= 1; i++)
    state.shots.push({ x: state.gunX + i * 9, y: 608 });
  sprinkle(state.gunX, 615, "#c7f5ff", 3);
}
