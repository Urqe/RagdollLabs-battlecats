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
    state.barricadeFlashes[barrierIndex] = 0.48;
    notify(
      gate.mult === 99 ? "×99 OPEN — AIM LEFT!" : "×999 OPEN — AIM RIGHT!",
      3,
    );
    sprinkle(gate.x, BARRICADE_HIT_Y, "#d48b4b", 24);
  }
}

// One representation for HUD counters, visible wood damage and diagnostics.
export function barrierStatus(state, index) {
  const progress = Math.min(1, state.work[index] / workNeeded[index]);
  return {
    progress,
    remaining: workNeeded[index] - state.work[index],
    open: state.gates[index + 1].open,
    label: state.gates[index + 1].open
      ? "OPEN"
      : Math.floor(progress * 100) + "%",
  };
}
