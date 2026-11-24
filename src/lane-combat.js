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

function advanceFront(state, combat, dt) {
  const blue = Math.min(state.blueTotal, combat.bluePressureCapacity ?? Infinity);
  const red = state.redTotal * combat.redPressurePerCat;
  const total = blue + red;
  const momentum = total ? (red - blue) / total : 0;
  const direction = Math.sign(momentum);
  const stronger = Math.max(red, blue);
  const weaker = Math.min(red, blue);
  const relative = stronger ? weaker / stronger : 1;
  const blueLeading = direction < 0;
  const resistance = combat.maxRedLoss * combat.redPressurePerCat;
  const contactLimit = blueLeading ? resistance : combat.maxRedLoss;
  const commitment = blueLeading ? (combat.advanceFormationPressure ?? 0) : 0;
  const committed = stronger >= Math.max(commitment, Math.max(160, contactLimit) * (blueLeading ? 2 : 4));
  const prior = state.advanceDirection === direction ? state.advanceMode : "contested";
  let mode = "contested";
  if (committed && relative < (prior === "contested" ? 0.06 : 0.10) &&
      weaker <= contactLimit * (prior === "contested" ? 0.24 : 0.36)) {
    const marching = prior === "marching";
    mode = relative < (marching ? 0.035 : 0.015) &&
      weaker <= contactLimit * (marching ? 0.12 : 0.06) ? "marching" : "overwhelming";
  }
  state.advanceMode = mode;
  state.advanceDirection = direction;

  const pushScale = combat.blueFullAdvanceAt
    ? clamp(state.blueTotal / combat.blueFullAdvanceAt, 0.45, 1)
    : 1;
  const speed = blueLeading ? combat.blueAdvance * pushScale : combat.redAdvance;
  const boost = mode === "marching" ? 1.1 : mode === "overwhelming" ? 0.55 : 0;
  const bonus = direction * speed * boost * (blueLeading ? 1 : 0.18);
  const active = state.advanceBonus ?? 0;
  state.advanceBonus = active + clamp(bonus - active, -18 * dt, 18 * dt);
  // Contact pressure remains the base movement. The eased bonus cannot
  // carry the front against the current pressure or move an empty front.
  const extra = Math.sign(state.advanceBonus) === direction ? state.advanceBonus : 0;
  state.front = clamp(state.front + (momentum * speed + extra) * dt,
    combat.minFront, combat.maxFront);
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
  // With a live supply line, arriving defenders need time to reach melee.
  const redLossRate = state.redEntryOpen && combat.redLossPerDefender !== undefined
    ? Math.min(rates.red, red * combat.redLossPerDefender)
    : rates.red;
  const redLost = Math.min(red, redLossRate * dt);
  const blueLost = Math.min(blue, rates.blue * dt);
  state.redTotal -= redLost;
  state.blueTotal -= blueLost;

  advanceFront(state, combat, dt);

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
