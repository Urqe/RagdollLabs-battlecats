export const W = 420,
  H = 760,
  TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const workNeeded = [54, 126];
export const BARRICADE_HIT_Y = 545,
  GATE_HIT_Y = 565,
  SHOT_INTERVAL = 0.28,
  BLUE_SPEED = 104;
