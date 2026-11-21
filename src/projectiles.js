import { BARRICADE_HIT_Y, GATE_HIT_Y, LEVEL } from "./config.js";
import { hitBarricade } from "./barricades.js";
export function updateProjectiles(
  state,
  dt,
  spawnSquad,
  sprinkle,
  notify,
  onEffect = null,
) {
  for (let j = state.shots.length - 1; j >= 0; j--) {
    const shot = state.shots[j],
      previousY = shot.y;
    shot.y -= LEVEL.projectileSpeed * dt;
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
    // A partial volley may open wood while its siblings are already between
    // the gate and wood planes. Consume those at the newly opened gate too.
    if (!(shot.y < hitY && (gate.open || previousY >= hitY))) continue;
    state.shots.splice(j, 1);
    if (gate.open) {
      spawnSquad(gate, shot.x, Math.min(previousY, hitY), shot.slot);
      continue;
    }
    hitBarricade(state, gateIndex, shot, sprinkle, notify);
    onEffect?.(gate.open ? "break" : "wood", state.t);
  }
}
export function fire(state, sprinkle) {
  // Three physical cats fly up the lane. A gate multiplies each one on contact.
  for (let i = -1; i <= 1; i++)
    state.shots.push({ x: state.gunX + i * 9, y: 608, slot: i });
  state.recoil = 1;
  sprinkle(state.gunX, 615, "#c7f5ff", 3);
}
