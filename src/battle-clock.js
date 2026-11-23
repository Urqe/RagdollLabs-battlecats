// Keep combat on the same timeline when the browser renders at different rates.
export function createBattleClock(step) {
  const interval = 1 / 60;
  let elapsed = 0;
  let paused = false;
  return {
    get paused() { return paused; },
    pause() { paused = true; },
    resume() { paused = false; },
    reset() {
      elapsed = 0;
      paused = false;
    },
    advance(dt) {
      if (paused) return;
      elapsed += Math.min(Math.max(0, dt), 0.05);
      while (!paused && elapsed + 1e-9 >= interval) {
        elapsed -= interval;
        step(interval);
      }
    },
  };
}
