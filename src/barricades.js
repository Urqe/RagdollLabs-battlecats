import { workNeeded, BARRICADE_HIT_Y } from "./config.js";
export function hitBarricade(state, gateIndex, shot, sprinkle, notify) {
  const gate = state.gates[gateIndex];
  const barrierIndex = gateIndex - 1;
  if (barrierIndex < 0) return;
  state.work[barrierIndex] = Math.min(
    workNeeded[barrierIndex],
    state.work[barrierIndex] + 1,
  );
  state.barricadeFlashes[barrierIndex] = 0.25;
  sprinkle(shot.x, BARRICADE_HIT_Y, "#e9b779", 6);
  if (state.work[barrierIndex] === workNeeded[barrierIndex]) {
    gate.open = true;
    notify(
      gate.mult === 99 ? "×99 OPEN — AIM LEFT!" : "×999 OPEN — AIM RIGHT!",
      3,
    );
    sprinkle(gate.x, gate.y, "#ffd276", 38);
  }
}
