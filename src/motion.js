import { clamp } from "./config.js";
import { LEVEL_ONE } from "./levels.js";
import { impactShape } from "./formation.js";
import { LITERAL_ARMY } from "./army-visual.js";

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
  const contact = {};
  const impact = {};
  let lastRed = null;
  let lastBlue = null;

  function reset() {
    clock = direction = nextDirection = directionTime = 0;
    tails.length = falls.length = 0;
    lastRed = lastBlue = null;
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
      blueStrength: null,
      blueAnchor: 210,
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
    const visible = contact.blueStrength ?? 0;
    contact.blueStrength = blueStrength <= LITERAL_ARMY
      ? blueStrength
      : Math.min(blueStrength, visible + (blueStrength - visible) * (1 - Math.exp(-dt / 0.46)));
    contact.blueAnchor +=
      (210 - contact.blueAnchor) * (1 - Math.exp(-dt / 0.57));
    if (!redEntryOpen) contact.cutoffAt ??= time;
    else if (battle) contact.entryRate = battle.redEntryRate;
    if (battle) {
      const red = Math.ceil(battle.redTotal);
      const blue = Math.ceil(blueStrength);
      if (lastRed > red && lastRed <= LITERAL_ARMY && impact.at !== time)
        addFall(210, battle.front, true, time);
      if (lastBlue > blue && lastBlue <= LITERAL_ARMY)
        addFall(210, battle.front, false, time);
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
      if ((contact.blueStrength ?? 0) < 115)
        contact.blueAnchor = value.x ?? 210;
      const duration = waveDuration(waveProfile(value.mult));
      const age = value.marchTime;
      if (tails.length === MAX_TAILS) tails.shift();
      tails.push({ ...value, born: time - age, until: time + duration + 0.24 });
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
