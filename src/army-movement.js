import { clamp } from "./config.js";

export const JOIN_DURATION = 0.34;
export const FLAG_CAPTURE_TIME = 0.95;
export const FLAG_RAISE_TIME = 0.36;

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

// The first rank starts six pixels behind the frozen combat line.
export function victoryAdvance(front, flagY, elapsed, depth = 0) {
  const delay = 0.22 * depth;
  const time = clamp((elapsed - delay) / (FLAG_CAPTURE_TIME + 0.18 * depth), 0, 1);
  return (front + 6 - flagY) * (1 - depth * 0.14) * smoothStep(time ** 0.75);
}

export function victoryWaveVisibility(elapsed, duration) {
  return 1 - smoothStep((elapsed / duration - 0.55) / 0.45);
}
