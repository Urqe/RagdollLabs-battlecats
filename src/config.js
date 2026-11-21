export const W = 420,
  H = 760,
  TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const workNeeded = [108, 270];
export const BARRICADE_HIT_Y = 545,
  GATE_HIT_Y = 565,
  SHOT_INTERVAL = 0.28,
  BLUE_SPEED = 104;

// Level 1 balance. Speeds are battlefield pixels/second; rates are cats/second.
export const LEVEL = Object.freeze({
  initialFront: 283,
  initialRed: 22000,
  maxRed: 29000,
  redReinforcements: 195,
  blueAttrition: 235,
  counterattackAttrition: 185,
  redAttrition: 165,
  counterattackDamagePerCat: 0.8,
  maxCounterattackDamage: 3200,
  defendedThreshold: 20,
  strongDefenseThreshold: 1200,
  counterattackThreshold: 850,
  redAdvance: 5.8,
  defendedAdvance: 2.1,
  strongDefenseAdvance: -0.4,
  counterattackAdvance: 1.1,
  counterattackPush: -8,
  clearedFront: 30,
  minFront: 25,
  maxFront: 712,
  castleFront: 690,
  minMarchTime: 0.25,
  arrivalOffset: 17,
  projectileSpeed: 315,
  spawnY: 532,
});
