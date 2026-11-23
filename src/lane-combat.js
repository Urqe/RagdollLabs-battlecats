import { clamp } from "./config.js";

export function casualtyRates(blue, red, combat) {
  const contact = Math.min(blue, red);
  const engagedRed = Math.min(red, contact * combat.redEngagementRatio);
  return {
    red: Math.min(combat.maxRedLoss, blue * combat.redLossPerBlue),
    blue: engagedRed * combat.blueLossPerRed + contact * combat.blueContactLoss,
  };
}

export function marchSquad(squad, front, combat, marchSpeed, dt) {
  squad.y -= marchSpeed * dt;
  squad.marchTime = (squad.marchTime ?? 0) + dt;
  return squad.marchTime >= combat.minMarchTime &&
    squad.y <= front + combat.arrivalOffset;
}

export function advanceLaneCombat(state, combat, objective, time, dt) {
  // Taking the entrance cuts off new arrivals. The existing army stays in combat.
  const access = state.redEntryOpen
    ? clamp(
        (state.front - objective.reinforcementCutoff) /
          combat.reinforcementApproach,
        0,
        1,
      )
    : 0;
  state.redEntryRate =
    access *
    Math.min(
      combat.maxRedReinforcements,
      combat.redReinforcements + combat.redReinforcementGrowth * time,
    );
  const redArrived = state.redEntryRate * dt;
  state.redTotal += redArrived;

  const blue = state.blueTotal;
  const red = state.redTotal;
  const rates = casualtyRates(blue, red, combat);
  const redLost = Math.min(red, rates.red * dt);
  const blueLost = Math.min(blue, rates.blue * dt);
  state.redTotal -= redLost;
  state.blueTotal -= blueLost;

  const bluePressure = state.blueTotal;
  const redPressure = state.redTotal * combat.redPressurePerCat;
  const totalPressure = bluePressure + redPressure;
  if (totalPressure > 0) {
    const momentum = (redPressure - bluePressure) / totalPressure;
    const speed = momentum > 0 ? combat.redAdvance : combat.blueAdvance;
    state.front = clamp(
      state.front + momentum * speed * dt,
      combat.minFront,
      combat.maxFront,
    );
  }

  if (
    state.redEntryOpen &&
    state.blueTotal > 0 &&
    state.front <= objective.reinforcementCutoff
  ) {
    state.redEntryOpen = false;
    state.redEntryRate = 0;
  }
  return { redArrived, redLost, blueLost };
}
