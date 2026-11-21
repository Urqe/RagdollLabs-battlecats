import { clamp } from "./config.js";

export const IMPACT_LIFE = 1.24;
export const AIRBORNE_LIMIT = 13;

export function impactShape(impact, hit) {
  const force = Math.min(1, Math.sqrt(hit.loss / 2400));
  impact.x = hit.x;
  impact.y = hit.y;
  impact.at = hit.at;
  impact.loss = hit.loss;
  impact.force = force;
  impact.radiusX = 15 + force * 35;
  impact.radiusY = 8 + force * 21;
  impact.airborne = Math.min(AIRBORNE_LIMIT, Math.ceil(hit.loss / 175));
}

export function gapStrength(age) {
  if (!(age >= 0 && age < IMPACT_LIFE)) return 0;
  const opening = clamp(age / 0.13, 0, 1);
  const refill = clamp((age - 0.25) / (IMPACT_LIFE - 0.25), 0, 1);
  return opening * (1 - refill * refill * (3 - 2 * refill));
}

// Bend rows around an empty pocket without hiding or adding survivors.
// The quadratic falloff reaches zero before the neighboring rows are affected.
export function gapShift(x, y, gap, strength, slot) {
  if (!strength) return 0;
  const cross = Math.abs(x - gap.x) / gap.radiusX;
  if (cross >= 1) return 0;
  const along = y - gap.y;
  const edge = gap.radiusY * Math.sqrt(1 - cross * cross);
  const weight = 1 - Math.abs(along) / (edge * 2.15);
  if (weight <= 0) return 0;
  const side = Math.sign(along) || (slot % 2 ? 1 : -1);
  return side * edge * weight * weight * strength;
}
