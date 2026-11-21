import { LEVEL_ONE } from "./levels.js";

export const W = LEVEL_ONE.battlefield.width;
export const H = LEVEL_ONE.battlefield.height;
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Level 1 exports used by the original regression fixtures and presentation defaults.
export const workNeeded = LEVEL_ONE.barricades.map(({ hits }) => hits);
export const BARRICADE_HIT_Y = LEVEL_ONE.barricades[0].hitY;
export const GATE_HIT_Y = LEVEL_ONE.gates[0].hitY;
export const SHOT_INTERVAL = LEVEL_ONE.battlefield.shotInterval;
export const BLUE_SPEED = LEVEL_ONE.battlefield.marchSpeed;
export const LEVEL = Object.freeze({
  ...LEVEL_ONE.combat,
  ...LEVEL_ONE.objective,
});
