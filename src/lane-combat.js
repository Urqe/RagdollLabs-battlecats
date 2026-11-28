import { clamp } from "./config.js";

// Linear for sparse ranks, with square-root growth once reserves dominate.
export function effectiveStrength(population, frontage) {
  return (population / (1 + Math.sqrt(1 + population / frontage))) * 2;
}

function redEngagedPopulation(population, combat) {
  const reserve = combat.redMobilization;
  if (!reserve || population <= reserve.frontRanks) return population;
  return reserve.frontRanks + reserve.frontRanks * Math.log1p((population - reserve.frontRanks) / reserve.frontRanks);
}

export function redStrength(population, combat) {
  return effectiveStrength(redEngagedPopulation(population, combat), combat.frontage) * combat.redPressurePerCat;
}

export function redSupplyRate(time, combat) {
  const ordinary = Math.min(combat.maxRedReinforcements,
    combat.redReinforcements + combat.redReinforcementGrowth * time);
  const reserve = combat.redMobilization;
  if (!reserve) return ordinary;
  const age = time - reserve.start;
  return ordinary + reserve.rate * clamp(age / 8, 0, 1) * clamp((reserve.duration - age) / 8, 0, 1);
}

export function casualtyRates(blue, red, combat) {
  const redInReach = redEngagedPopulation(red, combat);
  const contact = Math.min(blue, redInReach);
  const engagedRed = Math.min(redInReach, contact * combat.redEngagementRatio);
  const reserveCapacity = combat.redMobilization
    ? combat.redMobilization.collapseRate * clamp((blue - redStrength(red, combat)) / 8500, 0, 1) : 0;
  return {
    red: Math.min(combat.maxRedLoss + reserveCapacity, blue * combat.redLossPerBlue),
    blue: Math.min(combat.maxBlueLoss ?? Infinity,
      engagedRed * combat.blueLossPerRed + contact * combat.blueContactLoss),
  };
}

export function marchSquad(squad, front, combat, marchSpeed, dt) {
  squad.y -= marchSpeed * dt;
  squad.marchTime = (squad.marchTime ?? 0) + dt;
  return squad.marchTime >= combat.minMarchTime &&
    squad.y <= front + combat.arrivalOffset;
}

function advanceFront(state, combat, dt, blueSupport) {
  const blue = effectiveStrength(state.blueTotal, combat.frontage) + blueSupport;
  const red = redStrength(state.redTotal, combat);
  state.bluePressure = blue;
  state.redPressure = red;

  const total = blue + red;
  const advantage = total > 0 ? (red - blue) / total : 0;
  const blueLeading = advantage < 0;
  const strength = Math.abs(advantage);
  const weaker = Math.min(blue, red);
  const stronger = Math.max(blue, red);
  const resistance = combat.marchResistance * (blueLeading ? combat.redPressurePerCat : 1);
  const commitment = Math.min(6500, combat.frontage);
  // Absolute contact and relative opposition both reduce free movement.
  // A diffuse handful of defenders should not stop an established formation.
  const freedom = strength ** 4 * stronger / (stronger + commitment) /
    (1 + weaker / (resistance + stronger * 0.08));
  state.advanceMode = freedom > 0.8 ? "marching" : freedom > 0.35 ? "overwhelming" : "contested";
  const speed = blueLeading ? combat.blueAdvance : combat.redAdvance;
  const target = advantage * speed * (1 + freedom * (blueLeading ? 1.1 : 0.2));
  const velocity = state.frontVelocity ?? 0;
  const nextVelocity = total > 0 ? velocity + clamp(target - velocity, -32 * dt, 32 * dt) : 0;
  const next = clamp(state.front + nextVelocity * dt, combat.minFront, combat.maxFront);
  state.frontVelocity = (next - state.front) / dt;
  state.front = next;
}

export function advanceLaneCombat(state, combat, objective, time, dt, blueSupport = 0) {
  const previousFront = state.front;
  // Taking the entrance cuts off new arrivals. The existing army stays in combat.
  const access = state.redEntryOpen
    ? clamp(
        (state.front - objective.reinforcementCutoff) /
          combat.reinforcementApproach,
        0,
        1,
      )
    : 0;
  state.redEntryRate = access * redSupplyRate(time, combat);
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

  advanceFront(state, combat, dt, blueSupport);

  if (
    state.redEntryOpen &&
    state.blueTotal > 0 &&
    Math.min(previousFront, state.front) <= objective.reinforcementCutoff
  ) {
    state.redEntryOpen = false;
    state.redEntryRate = 0;
  }
  return { redArrived, redLost, blueLost };
}
