import { effectiveStrength } from "./lane-combat.js";


const FORECAST_INTERVAL = 0.2;
const REACTION_ALLOWANCE = 0.55;

export function createDanger() {
  return {
    level: "stable", lossRate: 0, velocity: 0, nextCheck: 0,
    survival: Infinity, rescueTime: Infinity, flashUntil: 0,
    nextPressureFlash: 0, nextCriticalFlash: 0, gate: null,
  };
}

export function reinforcementTime(state, y, marchTime = 0, delay = 0, velocity = 0) {
  const { combat, battlefield } = state.level;
  const distance = y - state.front - combat.arrivalOffset - velocity * delay;
  return delay + Math.max(0, combat.minMarchTime - marchTime,
    distance / (battlefield.marchSpeed + velocity));
}

export function updateDanger(state, dt, lossRate, velocity) {
  if (!(dt > 0)) return;
  const { danger, level, t, blueTotal, redTotal } = state;
  const blend = 1 - Math.exp(-dt / 0.42);
  danger.lossRate += (lossRate - danger.lossRate) * blend;
  danger.velocity += (velocity - danger.velocity) * blend;
  if (t < danger.nextCheck) return;
  danger.nextCheck = t + FORECAST_INTERVAL;
  const retreat = Math.max(0, danger.velocity);
  const castleTime = retreat > 0 ? (level.objective.castleFront - state.front) / retreat : Infinity;
  const gate = state.gates.reduce((best, candidate) =>
    candidate.open && (!best || candidate.mult > best.mult) ? candidate : best, null);
  const delay = REACTION_ALLOWANCE + level.battlefield.shotInterval +
    (gate ? (level.battlefield.shotY - gate.hitY) / level.combat.projectileSpeed : 0);
  const rescue = gate ? reinforcementTime(state, level.combat.spawnY, 0, delay, danger.velocity) : Infinity;
  danger.gate = gate?.mult ?? null;
  danger.rescueTime = rescue;

  // Credit squads only if they can reach the line before the projected gap.
  // Castle reach stays a separate limit during retreat.
  let survival = danger.lossRate > 0 ? blueTotal / danger.lossRate : Infinity;
  if (Number.isFinite(survival) && survival < 10) {
    const marching = state.squads.map((q) => ({
      eta: reinforcementTime(state, q.y, q.marchTime, 0, danger.velocity),
      count: q.count,
    })).sort((a, b) => a.eta - b.eta);
    for (const q of marching) {
      if (q.eta > Math.min(survival, castleTime)) break;
      survival += q.count / danger.lossRate;
    }
  }
  const { frontage, redPressurePerCat } = level.combat;
  const enemyAdvantage = effectiveStrength(redTotal, frontage) * redPressurePerCat >
    effectiveStrength(blueTotal, frontage);
  const exposed = state.squads.length === 0 || blueTotal > 0;
  // A gap alone does not lose the game. With troops marching and the castle
  // still safe, avoid treating the first arrival as a collapse.
  const effectiveSurvival = exposed ? survival : Infinity;
  danger.survival = Math.min(effectiveSurvival, castleTime);
  const critical = Math.max(1.65, Number.isFinite(rescue) ? rescue + 0.65 : 1.65);
  const pressure = Math.max(5, Number.isFinite(rescue) ? rescue + 3 : 5);
  const previous = danger.level;
  const worsening = enemyAdvantage || retreat > 1;
  if (redTotal <= 0 || !worsening) danger.level = "stable";
  else if (danger.survival <= critical + (previous === "critical" ? 0.8 : 0)) {
    danger.level = "critical";
  } else if (danger.survival <= pressure + (previous !== "stable" ? 1 : 0)) {
    danger.level = "pressure";
  } else danger.level = "stable";

  if (danger.level === "stable") {
    danger.flashUntil = 0;
  } else if (danger.level !== previous) {
    const criticalNow = danger.level === "critical";
    const cooldown = criticalNow ? "nextCriticalFlash" : "nextPressureFlash";
    if (t >= danger[cooldown]) {
      danger.flashUntil = t + 1.55;
      danger[cooldown] = t + 6;
      danger.nextPressureFlash = Math.max(danger.nextPressureFlash, t + 3);
    }
  }
}
