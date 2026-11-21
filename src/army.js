import { BLUE_SPEED, LEVEL, clamp } from "./config.js";
export function updateArmy(state, dt, sprinkle, end, notify = () => {}) {
  // Only arrived formations influence combat or frontline movement.
  for (let j = state.squads.length - 1; j >= 0; j--) {
    const q = state.squads[j];
    q.y -= BLUE_SPEED * dt;
    q.marchTime = (q.marchTime ?? 0) + dt;
    if (
      q.marchTime >= LEVEL.minMarchTime &&
      q.y <= state.front + LEVEL.arrivalOffset
    ) {
      state.blueTotal += q.count;
      state.squads.splice(j, 1);
      sprinkle(
        q.x + (210 - q.x) * 0.8,
        state.front + LEVEL.arrivalOffset,
        "#64bbff",
        4,
      );
      if (q.mult === 999 && !state.finalActivated) {
        state.finalActivated = true;
        notify("COUNTERATTACK! KEEP FIRING ×999!", 3);
      }
    }
  }
  if (!state.finalActivated)
    state.redTotal = Math.min(
      LEVEL.maxRed,
      state.redTotal + LEVEL.redReinforcements * dt,
    );
  if (state.redTotal > 0 && state.blueTotal > 0) {
    // Counterattack damage scales with soldiers actually fighting, never with
    // the gate opening or the number still marching down the road.
    const redRate = state.finalActivated
      ? Math.min(
          LEVEL.maxCounterattackDamage,
          state.blueTotal * LEVEL.counterattackDamagePerCat,
        )
      : Math.min(LEVEL.redAttrition, state.blueTotal);
    state.redTotal = Math.max(0, state.redTotal - redRate * dt);
    state.blueTotal = Math.max(
      0,
      state.blueTotal -
        (state.finalActivated
          ? LEVEL.counterattackAttrition
          : LEVEL.blueAttrition) *
          dt,
    );
  }
  const power = state.blueTotal;
  const velocity = state.finalActivated
    ? power > LEVEL.counterattackThreshold
      ? LEVEL.counterattackPush
      : LEVEL.counterattackAdvance
    : power > LEVEL.strongDefenseThreshold
      ? LEVEL.strongDefenseAdvance
      : power > LEVEL.defendedThreshold
        ? LEVEL.defendedAdvance
        : LEVEL.redAdvance;
  state.front = clamp(
    state.front + velocity * dt,
    LEVEL.minFront,
    LEVEL.maxFront,
  );
  // Clearing is physical advancement by the surviving army, not a timer or
  // bonus retreat after the last enemy dies.
  if (
    state.finalActivated &&
    state.redTotal === 0 &&
    state.front <= LEVEL.clearedFront &&
    state.blueTotal > 0
  ) {
    end(true);
    return;
  }
  if (state.front >= LEVEL.castleFront) end(false);
}
