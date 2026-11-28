import { ordinaryRed } from "./pawtorians.js";
import { launchArmorImpact } from "./pawtorian-visual.js";
import { arrowSpread, ARROW_AFTERMATH_LIFE, reactToArrows } from "./archer-render.js";
import { createAirborneCats, MAX_AIRBORNE_CATS } from "./airborne-cats.js";
import { clamp } from "./config.js";
import { LEVEL_ONE } from "./levels.js";
import { createReinforcementVisual } from "./reinforcement-visual.js";
import { laneHalfWidth } from "./terrain.js";
import { impactShape, launchImpactCats } from "./formation.js";
import { createFormationDynamics, EXCHANGE_DURATION } from "./formation-dynamics.js";
import { fieldColumn, fieldSpacing, LITERAL_ARMY } from "./army-visual.js";
import {
  createArmyPresentation, resetArmyPresentation, stepArmyPresentation,
} from "./army-continuity.js";

const profiles = {
  5: {
    count: 5,
    cols: 2,
    rankDelay: 0.078,
    spacing: 8,
    spread: 0.08,
    flare: 0.16,
    laneOffset: 14,
  },
  25: {
    count: 25,
    cols: 4,
    rankDelay: 0.068,
    spacing: 12,
    spread: 0.25,
    flare: 0.34,
    laneOffset: 13,
  },
  100: {
    count: 32,
    cols: 5,
    rankDelay: 0.088,
    spacing: 12.8,
    spread: 0.29,
    flare: 0.57,
    laneOffset: 21,
  },
};
export const waveProfile = (mult) => profiles[mult] ?? profiles[5];
export const waveRelease = (profile, index) => {
  const rank = Math.floor(index / profile.cols);
  return (
    rank * profile.rankDelay +
    (index % profile.cols) * 0.018 +
    (rank % 2) * 0.013
  );
};
export const waveDuration = (profile) =>
  waveRelease(profile, profile.count - 1);

// Positions start at the actual crossing and converge toward the simulation's
// marching path. Later figures leave the gate on their own presentation clock.
export function waveY(entryY, age, level = LEVEL_ONE) {
  const blend = clamp(age / 0.29, 0, 1);
  return (
    entryY -
    level.battlefield.marchSpeed * age -
    (entryY - level.combat.spawnY) * blend
  );
}

const FALL_LIFE = 0.38;
const MAX_FALLS = 12;
// At most three squads per volley. Leave room for overlapping journeys
// between both gate planes and the rear formation at the fastest fire rate.
export const MAX_TAILS = 48;

export const waveCount = (cohort) => Math.min(cohort.count,
  waveProfile(cohort.mult).count + (cohort.relay ? 16 : 0));
const EXCHANGE_LANES = [0, -1, 2, -2, 1];

export function createMotion(onReversal = () => {}) {
  const tails = [];
  const airborne = createAirborneCats();
  const nextCasualty = [0, 0];
  let nextKnockback;
  let hitIndex;
  let seed;
  const falls = [];
  const pulses = new Float64Array(3);
  const arrivals = new Float64Array(3);
  const indexOf = (mult) => (mult === 5 ? 0 : mult === 25 ? 1 : 2);
  let clock = 0;
  let direction = 0;
  let nextDirection = 0;
  let directionTime = 0;
  const dynamics = createFormationDynamics();
  const contact = {
    exchanges: [ { red: true }, { red: false } ],
    redArmy: createArmyPresentation(),
    blueArmy: createArmyPresentation(),
    reinforcements: createReinforcementVisual(),
  };
  const impact = {};
  let battleFront;
  const archers = { launch: null, impact: null, aftermath: [] };
  let supportLoss = 0;
  let lastRed = null;
  let exchangeIndex = 0;
  let lastBlue = null;

  function reset() {
    clock = direction = nextDirection = directionTime = 0;
    tails.length = falls.length = 0;
    airborne.reset();
    contact.reinforcements.reset();
    nextCasualty.fill(0);
    nextKnockback = hitIndex = 0;
    seed = 1729;
    battleFront = undefined;
    lastRed = lastBlue = null;
    archers.launch = archers.impact = null;
    archers.aftermath.length = 0;
    supportLoss = 0;
    exchangeIndex = 0;
    for (const exchange of contact.exchanges) exchange.at = -Infinity;
    dynamics.reset();
    resetArmyPresentation(contact.redArmy);
    resetArmyPresentation(contact.blueArmy);
    Object.assign(impact, {
      x: 0,
      y: 0,
      at: -Infinity,
      loss: 0,
      force: 0,
      radiusX: 0,
      radiusY: 0,
    });
    pulses.fill(-Infinity);
    arrivals.fill(-Infinity);
    Object.assign(contact, {
      pressure: 0,
      red: 0,
      blue: 0,
      foughtAt: -1,
      clashX: 210,
      clashAge: 0,
      surgeAt: -Infinity,

      blueAnchor: 210,
      blueAnchorTarget: 210,
      formation: null,
      cutoffAt: null,
      entryRate: 0,
    });
  }

  function step(
    time,
    velocity,
    blueStrength = 0,
    redEntryOpen = true,
    level = LEVEL_ONE,
    battle = null,
  ) {
    const dt = Math.max(0, time - clock);
    clock = time;
    if (battle && battle.mode !== "playing") airborne.reset();
    else {
      if (battle) stepArchers(battle, time);
      airborne.step(time);
    }
    const oldField = contact.blueArmy.population === null ? 0 : contact.blueArmy.target.field;
    const oldReserve = contact.blueArmy.population === null ? 0 : contact.blueArmy.target.reserve;
    stepArmyPresentation(contact.blueArmy, blueStrength, dt, true);
    allocateJoins(oldField, oldReserve);
    if (battle) {
      battleFront = battle.front;
      if (battle.mode !== "playing") {
        archers.launch = archers.impact = null;
        archers.aftermath.length = 0;
        impact.at = -Infinity;
        falls.length = 0;
      }
      stepArmyPresentation(contact.redArmy, ordinaryRed(battle), dt);
      if (battle.mode === "playing") {
        const engaged = blueStrength > 0 && battle.redTotal > 0;
        const depth = clamp(contact.blueArmy.target.field / 320 + contact.blueArmy.target.reserve / 640, 0, 1);
        const arrivalAt = Math.max(arrivals[0], arrivals[1], arrivals[2]);
        const losses = contact.blue * Math.max(0, 1 - (time - contact.foughtAt) / 0.38);
        dynamics.step(time, battle.front, level, engaged, arrivalAt, losses, depth);
        contact.formation = dynamics.pose;
      }
      if (battle.mode === "victory") {
        contact.foughtAt = -Infinity;
        contact.red = contact.blue = 0;
        for (const exchange of contact.exchanges) exchange.at = -Infinity;
      }
    }
    contact.blueAnchor +=
      (contact.blueAnchorTarget - contact.blueAnchor) * (1 - Math.exp(-dt / 0.16));
    contact.blueAnchorTarget +=
      (210 - contact.blueAnchorTarget) * (1 - Math.exp(-dt / 0.37));
    if (!redEntryOpen) contact.cutoffAt ??= time;
    else if (battle) contact.entryRate = battle.redEntryRate;
    if (battle) {
      const red = Math.ceil(ordinaryRed(battle));
      const blue = Math.ceil(blueStrength);
      if (battle.mode === "playing") {
        const redWithoutSupportLoss = Math.ceil(ordinaryRed(battle) + supportLoss);
        if (lastRed > redWithoutSupportLoss)
          showLoss(lastRed, redWithoutSupportLoss, battle.front, true, time);
        if (lastBlue > blue)
          showLoss(lastBlue, blue, battle.front, false, time, oldField);
      }
      lastRed = red;
      lastBlue = blue;
    }
    contact.reinforcements.setCapacity(contact.blueArmy.target);
    supportLoss = 0;
    const normalized =
      velocity /
      (velocity > 0 ? level.combat.redAdvance : level.combat.blueAdvance);
    contact.pressure +=
      (normalized - contact.pressure) * (1 - Math.exp(-dt / 0.24));
    contact.clashAge = clock - contact.foughtAt;
    const sign =
      contact.pressure > 0.13 ? 1 : contact.pressure < -0.13 ? -1 : 0;
    if (sign !== nextDirection) {
      nextDirection = sign;
      directionTime = 0;
    }
    directionTime += dt;
    if (sign && sign !== direction && directionTime > 0.37) {
      if (direction && contact.clashAge < 0.35) {
        contact.surgeAt = clock;
        onReversal(sign);
      }
      direction = sign;
    }
    for (let i = tails.length - 1; i >= 0; i--) {
      const q = tails[i];
      if (q.members?.every(member => member.settled)) tails.splice(i, 1);
    }
    while (falls.length && falls[0].at + FALL_LIFE <= clock) falls.shift();
    if (battle?.mode === "end") tails.length = 0;
  }

  function stepArchers(battle, time) {
    const { launch, impact: hit, aftermath } = archers;
    while (aftermath.length && time - aftermath[0].at >= ARROW_AFTERMATH_LIFE)
      aftermath.shift();
    if (launch && !launch.points)
      launch.points = arrowSpread(launch, battle.front, battle.redTotal);
    if (!hit) return;
    if (time - hit.at >= ARROW_AFTERMATH_LIFE) {
      archers.impact = null;
      return;
    }
    if (hit.points) return;
    hit.points = launch?.launchedAt === hit.launchedAt ? launch.points
      : arrowSpread(hit, battle.front, hit.loss > 0 ? battle.redTotal + hit.loss : 0);
    reactToArrows(airborne, hit, battle.redTotal);
  }

  function allocateJoins(field, reserve) {
    const pending = tails.filter(q => !q.members).reverse();
    const target = contact.blueArmy.target;
    for (const [index, q] of pending.entries()) {
      const remaining = pending.length - index;
      const limit = {
        field: Math.min(target.field, field + Math.ceil(Math.max(0, target.field - field) / remaining)),
        reserve: Math.min(target.reserve, reserve + Math.ceil(Math.max(0, target.reserve - reserve) / remaining)),
      };
      contact.reinforcements.admit(q, waveCount(q), field, reserve, limit);
      field = limit.field;
      reserve = limit.reserve;
    }
  }

  function showLoss(previous, current, front, red, time, oldField) {
    const lost = previous - current;
    const fraction = lost / previous;
    const count = previous <= LITERAL_ARMY ? Math.min(3, lost)
      : fraction >= 0.075 ? Math.min(7, 2 + Math.floor(fraction * 8)) : 0;
    const tip = front + (red ? -7 : 9);
    const half = laneHalfWidth(tip) - 6;
    const spacing = fieldSpacing(half, 0, previous, 14);
    const rank = Math.min(previous, 9);
    for (let i = 0; i < count; i++) {
      const slot = (exchangeIndex++ % rank);
      const x = 210 + fieldColumn(slot) * spacing;
      const member = red ? null : contact.reinforcements.replenish(slot,
        oldField, contact.blueArmy.target.reserve, contact.blueArmy.target.field);
      addFall(member?.x ?? x, front, red, time);
      const exchange = contact.exchanges[Number(!red)];
      if (time - exchange.at >= EXCHANGE_DURATION) {
        exchange.at = time;
        exchange.x = x;
      }
    }
  }

  function addFall(x, front, red, time) {
    if (falls.length === MAX_FALLS) falls.shift();
    falls.push({ x, y: front + (red ? -7 : 9), red, at: time });
  }

  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  function meleeReactions(at, x, front, redLoss, blueLoss) {
    // Once volleys begin, keep two slots available to support reactions.
    let meleeRoom = archers.launch
      ? MAX_AIRBORNE_CATS - 2 - airborne.active.reduce((count, cat) => count + Number(!cat.fromImpact), 0)
      : Infinity;
    for (const exchange of contact.exchanges) {
      if (meleeRoom <= 0) return;
      const { red } = exchange;
      const loss = red ? redLoss : blueLoss;
      const army = red ? contact.redArmy : contact.blueArmy;
      const side = red ? -1 : 1;
      // Literal formations already animate the disappearance of each lost slot.
      if (loss >= 1 && army.population > LITERAL_ARMY && at >= nextCasualty[Number(red)]) {
        const force = clamp(loss / 20, 0, 1);
        const launched = airborne.launch({
          at, red, defeated: true, intensity: 3,
          x: 210 + clamp((red ? x : 420 - x) - 210, -26, 26) + (random() - 0.5) * 18,
          y: front + side * (8 + random() * 10),
          vx: (random() - 0.5) * (72 + force * 40), vy: side * (19 + force * 15),
          lift: 142 + force * 42, spin: (random() < 0.5 ? -1 : 1) * 10,
          bounce: 0.24,
        });
        if (launched) meleeRoom--;
        nextCasualty[Number(red)] = at + 1.15 + random() * 0.45;
      }
    }
    if (meleeRoom <= 0 || at < nextKnockback || redLoss + blueLoss <= 0) return;
    const red = hitIndex % 2 === 0;
    const army = red ? contact.redArmy : contact.blueArmy;
    const count = Math.min(12, Math.ceil(army.target.field ?? 0));
    if (!count) return;
    const dramatic = hitIndex % 17 === 4;
    const sideways = (random() - 0.5) * 2;
    const side = red ? -1 : 1;
    const localX = 210 + clamp((red ? x : 420 - x) - 210, -24, 24);
    let slot;
    let distance = Infinity;
    for (let i = 0; i < count; i++) {
      if (airborne.slots[Number(red)][i]) continue;
      const offset = Math.abs(210 + fieldColumn(i) * 12 - localX) + random() * 10;
      if (offset >= distance) continue;
      distance = offset;
      slot = i;
    }
    if (slot === undefined) return;
    airborne.launch({
      at, red, x: localX, y: front + side * 8, slot,
      intensity: dramatic ? 4 : 1,
      vx: sideways * (dramatic ? 72 : 38), vy: side * (dramatic ? 38 : 23),
      lift: dramatic ? 224 : 86 + random() * 49,
      spin: (sideways < 0 ? -1 : 1) * (dramatic ? 14 : 7 + random() * 3),
      bounce: dramatic || random() < 0.36 ? 0.26 : 0,
    });
    hitIndex++;
    nextKnockback = at + 0.20 + random() * 0.11;
  }

  function receive(kind, time, value, front, redLoss, blueLoss) {
    if (kind === "archerLaunch") archers.launch = { ...value };
    if (kind === "archerImpact") {
      const { impact: previous, aftermath } = archers;
      if (previous?.points && time - previous.at < ARROW_AFTERMATH_LIFE) {
        if (aftermath.length === 2) aftermath.shift();
        aftermath.push(previous);
      }
      archers.impact = { ...value };
      supportLoss += value.loss;
    }
    if (kind === "artilleryImpact" && value?.loss > 0) {
      supportLoss += value.loss - (value.armor?.loss ?? 0);
      impactShape(impact, value);
      if (value.armor?.loss > 0) launchArmorImpact(airborne, impact, value.armor);
      let impactSeed = Math.round(time * 1000) >>> 0;
      const ordinaryImpact = value.armor ? {
        ...impact, loss: Math.max(0, value.loss - value.armor.loss),
      } : impact;
      if (ordinaryImpact.loss > 0) launchImpactCats(airborne, ordinaryImpact, battleFront ?? impact.y + 32, contact.redArmy, () => {
        impactSeed = (Math.imul(1664525, impactSeed) + 1013904223) >>> 0;
        return impactSeed / 2 ** 32;
      });
    }
    if (kind === "multiply") pulses[indexOf(value)] = time;
    if (kind === "arrival") {
      arrivals[indexOf(value.mult)] = time;
      if ((contact.blueArmy.population ?? 0) < 115)
        contact.blueAnchorTarget = value.x ?? 210;
      const age = value.marchTime;
      if (tails.length === MAX_TAILS) {
        // At exceptional load, grow an approaching column from the same
        // route without evicting any cats already on their way into ranks.
        let closest;
        let score = Infinity;
        for (const q of tails) {
          const distance = Math.abs((q.x ?? 210) - (value.x ?? 210))
            + Math.abs((q.slot ?? 0) - (value.slot ?? 0)) * 10
            + (q.mult === value.mult && Boolean(q.relay) === Boolean(value.relay) ? 0 : 420)
            + (q.members?.every(member => member.assigned || member.settled) ? 420 : 0)
            + (time - q.at) * 104;
          if (distance < score) {
            score = distance;
            closest = q;
          }
        }
        closest.grouped = true;
        closest.overflow = Math.min(48, (closest.overflow ?? 0) + waveCount(value));
        return;
      }
      tails.push({
        ...value, source: value, born: time - age, at: time, grouped: tails.length >= MAX_TAILS - 12,
      });
    }
    if (kind === "clash") {
      meleeReactions(time, value, front, redLoss, blueLoss);
      contact.red = Math.min(1, redLoss / 35);
      contact.blue = Math.min(1, blueLoss / 26);
      contact.foughtAt = time;
      contact.clashX = value;
      for (const exchange of contact.exchanges) {
        const loss = exchange.red ? redLoss : blueLoss;
        if (loss < 1 || time - exchange.at < EXCHANGE_DURATION) continue;
        const available = Math.min(contact.redArmy.target.field ?? 5, contact.blueArmy.target.field ?? 5);
        const lane = EXCHANGE_LANES[exchangeIndex++ % EXCHANGE_LANES.length];
        const half = Math.floor(Math.max(0, available - 1) / 2);
        exchange.at = time;
        exchange.x = 210 + clamp(lane, -half, half) * 12;
        if (!exchange.red && contact.blueArmy.population > LITERAL_ARMY) {
          const column = clamp(lane, -half, half);
          const slot = column > 0 ? column * 2 - 1 : -column * 2;
          contact.reinforcements.replenish(slot, contact.blueArmy.target.field, contact.blueArmy.target.reserve);
        }
      }
    }
  }

  reset();
  return { contact, airborne, impact, archers, tails, falls, pulses, arrivals, receive, reset, step };
}
