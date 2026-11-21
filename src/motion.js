import { clamp } from "./config.js";
import { LEVEL_ONE } from "./levels.js";
import { impactShape } from "./formation.js";
import { LITERAL_ARMY } from "./army-visual.js";
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

export function createMotion(onReversal = () => {}) {
  const tails = [];
  const falls = [];
  const pulses = new Float64Array(3);
  const arrivals = new Float64Array(3);
  const indexOf = (mult) => (mult === 20 ? 0 : mult === 99 ? 1 : 2);
  let clock = 0;
  let direction = 0;
  let nextDirection = 0;
  let directionTime = 0;
  const contact = {
    redArmy: createArmyPresentation(),
    blueArmy: createArmyPresentation(),
  };
  const impact = {};
  let lastRed = null;
  let lastBlue = null;

  function reset() {
    clock = direction = nextDirection = directionTime = 0;
    tails.length = falls.length = 0;
    lastRed = lastBlue = null;
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
      airborne: 0,
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
      hold: 0,
      surgeAt: -Infinity,

      blueAnchor: 210,
      blueAnchorTarget: 210,
      supportFront: null,
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
    const oldField = contact.blueArmy.population === null ? 0 : contact.blueArmy.target.field;
    const oldReserve = contact.blueArmy.population === null ? 0 : contact.blueArmy.target.reserve;
    stepArmyPresentation(contact.blueArmy, blueStrength, dt, true);
    allocateJoins(oldField, oldReserve);
    if (battle) {
      stepArmyPresentation(contact.redArmy, battle.redTotal, dt);
      const follow = contact.supportFront ?? battle.front;
      contact.supportFront = battle.front + clamp(
        (follow - battle.front) * Math.exp(-dt / 0.19), -10, 10,
      );
      if (battle.mode === "victory") {
        contact.foughtAt = -Infinity;
        contact.red = contact.blue = 0;
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
    const hold = 1 - Math.min(1, Math.abs(contact.pressure) * 2.6);
    contact.hold += (hold - contact.hold) * (1 - Math.exp(-dt / 0.21));
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

  function receive(kind, time, value, front, redLoss, blueLoss) {
    if (kind === "artilleryImpact" && value?.loss > 0) impactShape(impact, value);
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
      contact.red = Math.min(1, redLoss / 35);
      contact.blue = Math.min(1, blueLoss / 26);
      contact.foughtAt = time;
      contact.clashX = value;
      if (redLoss >= 7) addFall(value, front, true, time);
      if (blueLoss >= 7) addFall(420 - value, front, false, time);
    }
  }

  reset();
  return { contact, impact, tails, falls, pulses, arrivals, receive, reset, step };
}
