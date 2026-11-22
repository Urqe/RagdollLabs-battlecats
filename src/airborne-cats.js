import { clamp } from "./config.js";

export const MAX_AIRBORNE_CATS = 8;
const GRAVITY = 460;
const MAX_FLIGHT = 1.25;
const flightTime = (height, lift) =>
  (lift + Math.sqrt(lift * lift + 2 * GRAVITY * height)) / GRAVITY;

// Coordinates and velocities use canvas units. Depth motion stays on the
// battlefield plane; lift is projected upward independently.
export function createAirborneCats(limit = MAX_AIRBORNE_CATS) {
  const active = [];
  const slots = [[], []];

  function release(cat) {
    if (cat.slot !== undefined) slots[Number(cat.red)][cat.slot] = undefined;
  }

  function launch({ at, x, y, vx, vy, lift, spin, red = false, slot, defeated = false,
    height = 0, bounce = 0, intensity = 1 }) {
    const team = slots[Number(red)];
    if (slot !== undefined && team[slot]) return false;
    if (active.length >= limit) {
      // Reserve room for major impacts by replacing a weaker casualty effect.
      // Let living representatives finish their return to formation.
      const i = active.findIndex(cat => cat.defeated && cat.intensity < intensity);
      if (i === -1) return false;
      active.splice(i, 1);
    }
    const flight = Math.min(MAX_FLIGHT, flightTime(height, lift));
    const rebound = Math.min(MAX_FLIGHT - flight, 2 * Math.max(0, GRAVITY * flight - lift) * bounce / GRAVITY);
    const cat = { at, x, y, vx, vy, lift, spin, red, slot, defeated, height,
      flight, rebound, intensity, visible: slot === undefined };
    if (slot !== undefined) team[slot] = cat;
    active.push(cat);
    return true;
  }

  function step(time) {
    for (let i = active.length - 1; i >= 0; i--) {
      const cat = active[i];
      cat.visible = cat.slot === undefined && time >= cat.at;
      const age = time - cat.at;
      const landing = cat.flight + cat.rebound;
      const recovery = (age - landing) / (cat.defeated ? 0.24 : 0.32);
      if (recovery >= 1) {
        release(cat);
        active.splice(i, 1);
        continue;
      }
      const air = clamp(age, 0, cat.flight);
      const hop = clamp(age - cat.flight, 0, cat.rebound);
      const rise = air < cat.flight
        ? Math.max(0, cat.height + air * (cat.lift - GRAVITY * air / 2))
        : GRAVITY / 2 * hop * (cat.rebound - hop);
      const travel = air + hop * 0.4;
      const settle = clamp(recovery, 0, 1);
      const returning = cat.defeated ? 1 : 1 - settle * settle * (3 - 2 * settle);
      const angle = cat.spin * travel;
      cat.dx = cat.vx * travel * returning;
      cat.rise = rise;
      cat.dy = cat.vy * travel * returning - rise;
      cat.angle = age < landing || cat.defeated
        ? angle
        : (angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI))) * returning;
      cat.squash = recovery > 0 ? Math.sin(Math.PI * settle) * 0.65 : 0;
      cat.alpha = cat.defeated ? 1 - settle : 1;
    }
  }

  function reset() {
    active.length = slots[0].length = slots[1].length = 0;
  }

  return { active, slots, launch, step, reset };
}
