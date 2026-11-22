import { arrowSpread, ARROW_AFTERMATH_LIFE, reactToArrows } from "./archer-render.js";
import { createAirborneCats } from "./airborne-cats.js";
import { clamp } from "./config.js";
import { LEVEL_ONE } from "./levels.js";
import { impactShape, launchImpactCats } from "./formation.js";
import { createFormationDynamics, EXCHANGE_DURATION } from "./formation-dynamics.js";
import { fieldColumn, LITERAL_ARMY } from "./army-visual.js";
import {
  createArmyPresentation, resetArmyPresentation, stepArmyPresentation,
} from "./army-continuity.js";

const profiles = {
  20: {
    count: 3,
    cols: 2,
    rankDelay: 0.041,
    spacing: 7,
    spread: 0.08,
    flare: 0.16,
    laneOffset: 2,
  },
  99: {
    count: 9,
    cols: 3,
    rankDelay: 0.109,
    spacing: 12,
    spread: 0.25,
    flare: 0.34,
    laneOffset: 13,
  },
  999: {
    count: 24,
    cols: 4,
    rankDelay: 0.143,
    spacing: 12.8,
    spread: 0.29,
    flare: 0.57,
    laneOffset: 21,
  },
};
export const waveProfile = (mult) => profiles[mult] ?? profiles[20];
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
const MAX_TAILS = 12;
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
  const indexOf = (mult) => (mult === 20 ? 0 : mult === 99 ? 1 : 2);
  let clock = 0;
  let direction = 0;
  let nextDirection = 0;
  let directionTime = 0;
  const dynamics = createFormationDynamics();
  const contact = {
    exchanges: [ { red: true }, { red: false } ],
    redArmy: createArmyPresentation(),
    blueArmy: createArmyPresentation(),
  };
  const impact = {};
  let battleFront;
  const archers = { launch: null, impact: null };
  let lastRed = null;
  let exchangeIndex = 0;
  let lastBlue = null;

  function reset() {
    clock = direction = nextDirection = directionTime = 0;
    tails.length = falls.length = 0;
    airborne.reset();
    nextCasualty.fill(0);
    nextKnockback = hitIndex = 0;
    seed = 1729;
    battleFront = undefined;
    lastRed = lastBlue = null;
    archers.launch = archers.impact = null;
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
        impact.at = -Infinity;
      }
      stepArmyPresentation(contact.redArmy, battle.redTotal, dt);
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
      const red = Math.ceil(battle.redTotal);
      const blue = Math.ceil(blueStrength);
      if (lastRed > red && impact.at !== time)
        showLoss(lastRed, red, battle.front, true, time);
      if (lastBlue > blue)
        showLoss(lastBlue, blue, battle.front, false, time);
      lastRed = red;
      lastBlue = blue;
    }
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
      if (tails[i].until <= clock) tails.splice(i, 1);
    }
    while (falls.length && falls[0].at + FALL_LIFE <= clock) falls.shift();
    if (battle?.mode === "end") tails.length = falls.length = 0;
  }

  function stepArchers(battle, time) {
    const { launch, impact: hit } = archers;
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
    let pending = 0;
    for (const q of tails) pending += Number(!q.join);
    if (!pending) return;
    const target = contact.blueArmy.target;
    for (const q of tails) {
      if (q.join) continue;
      const capacity = waveProfile(q.mult).count;
      const fieldCount = Math.min(capacity, Math.ceil(Math.max(0, target.field - field) / pending));
      const reserveCount = Math.min(capacity - fieldCount,
        Math.ceil(Math.max(0, target.reserve - reserve) / pending));
      q.join = { field, fieldCount, reserve, reserveCount };
      if (fieldCount + reserveCount)
        q.join.started = new Float64Array(fieldCount + reserveCount).fill(-1);
      field += fieldCount;
      reserve += reserveCount;
      pending--;
    }
  }

  function showLoss(previous, current, front, red, time) {
    const lost = previous - current;
    const fraction = lost / previous;
    const count = previous <= LITERAL_ARMY ? Math.min(3, lost)
      : fraction >= 0.075 ? Math.min(7, 2 + Math.floor(fraction * 8)) : 0;
    const spread = Math.min(25, 4 + Math.abs(front - 266) * 0.14);
    for (let i = 0; i < count; i++) {
      const x = 210 + Math.sin(time * 9 + i * 2.4) * spread;
      addFall(x, front, red, time);
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
    for (const exchange of contact.exchanges) {
      const { red } = exchange;
      const loss = red ? redLoss : blueLoss;
      const army = red ? contact.redArmy : contact.blueArmy;
      const side = red ? -1 : 1;
      // Literal formations already animate the disappearance of each lost slot.
      if (loss >= 1 && army.population > LITERAL_ARMY && at >= nextCasualty[Number(red)]) {
        const force = clamp(loss / 20, 0, 1);
        airborne.launch({
          at, red, defeated: true, intensity: 3,
          x: 210 + clamp((red ? x : 420 - x) - 210, -26, 26) + (random() - 0.5) * 18,
          y: front + side * (8 + random() * 10),
          vx: (random() - 0.5) * (72 + force * 40), vy: side * (19 + force * 15),
          lift: 142 + force * 42, spin: (random() < 0.5 ? -1 : 1) * 10,
          bounce: 0.24,
        });
        nextCasualty[Number(red)] = at + 1.15 + random() * 0.45;
      }
    }
    if (at < nextKnockback || redLoss + blueLoss <= 0) return;
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
    if (kind === "archerImpact") archers.impact = { ...value };
    if (kind === "artilleryImpact" && value?.loss > 0) {
      impactShape(impact, value);
      let impactSeed = Math.round(time * 1000) >>> 0;
      launchImpactCats(airborne, impact, battleFront ?? impact.y + 32, contact.redArmy, () => {
        impactSeed = (Math.imul(1664525, impactSeed) + 1013904223) >>> 0;
        return impactSeed / 2 ** 32;
      });
    }
    if (kind === "multiply") pulses[indexOf(value)] = time;
    if (kind === "arrival") {
      arrivals[indexOf(value.mult)] = time;
      if ((contact.blueArmy.population ?? 0) < 115)
        contact.blueAnchorTarget = value.x ?? 210;
      const duration = waveDuration(waveProfile(value.mult));
      const age = value.marchTime;
      if (tails.length === MAX_TAILS) tails.shift();
      tails.push({
        ...value, born: time - age, at: time, until: time + duration + 0.53,
        join: null, painted: 0,
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
      }
    }
  }

  reset();
  return { contact, airborne, impact, archers, tails, falls, pulses, arrivals, receive, reset, step };
}
