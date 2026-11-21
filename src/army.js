import { BLUE_SPEED, clamp } from "./config.js";
export function updateArmy(state, dt, sprinkle, end) {
  // Each cat army physically travels across the battlefield. Deliver troops only
  // after the formation reaches the enemy line, never when a gate is hit.
  for (let j = state.squads.length - 1; j >= 0; j--) {
    const q = state.squads[j];
    q.y -= BLUE_SPEED * dt;
    if (q.y <= state.front + 17) {
      state.blueTotal += q.count;
      state.squads.splice(j, 1);
      sprinkle(q.x + (210 - q.x) * 0.8, state.front + 17, "#64bbff", 4);
    }
  }
  // Red cats are slower than blue cats, but the initial horde is overwhelmingly larger.
  // Until ×999 is actually used, new red soldiers keep entering from beyond the screen.
  if (!state.finalActivated)
    state.redTotal = Math.min(29000, state.redTotal + 195 * dt);
  if (state.redTotal > 0 && state.blueTotal > 0) {
    const blueLoss = Math.min(
      state.blueTotal,
      (state.finalActivated ? 185 : 235) * dt,
    );
    const redLoss = Math.min(
      state.redTotal,
      (state.finalActivated ? 3200 : 165) * dt,
    );
    state.blueTotal -= blueLoss;
    state.redTotal -= redLoss;
  }
  // ×20 alone cannot hold forever. ×99 allows more stable defense but the red
  // army never runs out until the player opens and fires through ×999.
  const power =
    state.blueTotal + state.squads.reduce((sum, q) => sum + q.count, 0) * 0.25;
  const velocity = state.finalActivated
    ? power > 850
      ? -12
      : 1.1
    : power > 1200
      ? -0.4
      : power > 280
        ? 2.1
        : 5.8;
  state.front = clamp(state.front + velocity * dt, 25, 712);
  if (state.finalActivated && state.redTotal <= 0) {
    state.redTotal = 0;
    state.front = Math.max(20, state.front - 20 * dt);
    if (state.front <= 30) {
      end(true);
      return;
    }
  }
  if (state.front >= 690) {
    end(false);
    return;
  }
}
