import { clamp } from "./config.js";

export const JOIN_DURATION = 0.34;

export function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

// Ease the marching speed into the receiving ranks. The soft shoulder has
// the same speed as the approach at entry and stays in the blue half.
export function receivingY(rawY, rear, front, entryY) {
  const dock = Math.min(entryY - 33, Math.max(front + 11, rear));
  const distance = rawY - dock;
  const shoulder = 22;
  const carried = distance >= shoulder
    ? distance
    : distance >= -shoulder
      ? shoulder * ((distance + shoulder) / (2 * shoulder)) ** 2
      : (distance + shoulder) * 0.37;
  const lower = Math.min(front + 9, dock - 5);
  return Math.max(lower, dock + carried);
}

export function mergeProgress(elapsed) {
  return smoothStep(elapsed / JOIN_DURATION);
}

// All displacements start at the recorded line. The lead reaches the
// entrance first, while depth delays and reduces the supporting advance.
export function victoryAdvance(front, elapsed, duration, depth = 0) {
  const delay = 0.18 * depth;
  const time = clamp((elapsed / duration - delay) / (0.70 + depth * 0.15), 0, 1);
  const progress = 1 - (1 - time) ** 2.3;
  return Math.max(0, front - 10) * (1 - depth * 0.25) * progress;
}

export function victoryWaveVisibility(elapsed, duration) {
  return 1 - smoothStep((elapsed / duration - 0.55) / 0.45);
}
