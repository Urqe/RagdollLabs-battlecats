export function barrierIndex(state, id) {
  return state.level.barricades.findIndex((barrier) => barrier.id === id);
}

export function hitBarricade(state, index, target, x, shot, sprinkle, notify) {
  const barrier = state.level.barricades[index];
  state.work[index]++;
  state.barricadeFlashes[index] = 0.25;
  sprinkle(shot.x, barrier.hitY, "#e9b779", 6);
  if (state.work[index] === barrier.hits) {
    target.open = true;
    state.barricadeFlashes[index] = 0.48;
    notify(barrier.message, 3);
    sprinkle(x, barrier.hitY, "#d48b4b", 24);
  }
}

// One representation for HUD counters, visible wood damage and diagnostics.
export function barrierStatus(state, index) {
  const { id, hits } = state.level.barricades[index];
  const progress = Math.min(1, state.work[index] / hits);
  const gate = state.gates.find((gate) => gate.barricadeId === id);
  const open = gate ? gate.open : state.support.open;
  return {
    progress,
    remaining: hits - state.work[index],
    open,
    label: open ? "OPEN" : Math.floor(progress * 100) + "%",
  };
}
