export const W = 420,
  H = 760,
  TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const workNeeded = [90, 231];
export const BARRICADE_HIT_Y = 545,
  GATE_HIT_Y = 565,
  SHOT_INTERVAL = 0.28,
  BLUE_SPEED = 104;

// Level 1 balance. Speeds are battlefield pixels/second; rates are cats/second.
export const LEVEL = Object.freeze({
  initialFront: 335,
  initialRed: 2225,
  redReinforcements: 150,
  redReinforcementGrowth: 34.1,
  maxRedReinforcements: 3200,
  redPressurePerCat: 0.04,
  maxRedLoss: 4400,
  redLossPerBlue: 0.111,
  blueLossPerRed: 0.013,
  blueContactLoss: 0.163,
  redAdvance: 21.1,
  blueAdvance: 13.7,
  reinforcementApproach: 50,
  combatEffectInterval: 0.12,
  clearedFront: 30,
  minFront: 25,
  maxFront: 712,
  castleFront: 690,
  minMarchTime: 0.25,
  arrivalOffset: 17,
  projectileSpeed: 315,
  spawnY: 532,
});
