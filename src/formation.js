import { laneHalfWidth } from "./terrain.js";
import { armyScale, fieldRow, fieldColumn } from "./army-visual.js";
import { rowsAt } from "./army-continuity.js";
import { clamp, TAU } from "./config.js";

export const IMPACT_LIFE = 1.24;

export function impactShape(impact, hit) {
  const force = Math.min(1, Math.sqrt(hit.loss / 2400));
  impact.x = hit.x;
  impact.y = hit.y;
  impact.at = hit.at;
  impact.loss = hit.loss;
  impact.force = force;
  impact.radiusX = 14 + force * 42;
  impact.radiusY = 6 + force * 29;
}

// Find a living field slot near each outward ray. The renderer supplies its
// exact current pose, so launching a survivor replaces its sprite until recovery.
export function launchImpactCats(airborne, hit, front, army, random) {
  const count = 2 + Math.round(hit.force * 6);
  const defeatedCount = Math.min(Math.floor(hit.loss), 1 + Math.floor(hit.force * 3));
  const remaining = Math.max(0, (army.population ?? hit.loss) - hit.loss);
  const { field } = armyScale(remaining);
  const tip = front - 6;
  const step = Math.min((tip - 3) * 0.59 / Math.max(1, rowsAt(field)), 8.9);
  const phase = (random() - 0.5) * 0.48;
  for (let i = 0; i < count; i++) {
    const angle = phase + i * TAU / count;
    const side = Math.cos(angle);
    const depth = Math.sin(angle);
    const reach = 0.33 + random() * 0.42;
    const y = clamp(hit.y + depth * hit.radiusY * reach, 8, Math.max(8, front - 7));
    const half = laneHalfWidth(y) - 7;
    const x = clamp(hit.x + side * hit.radiusX * reach, 210 - half, 210 + half);
    const power = (0.3 + hit.force * 0.7) * (i % 3 === 0 ? 1 : 0.32 + random() * 0.5);
    const defeated = i < defeatedCount * 2 && i % 2 === 0;

    let slot;
    if (!defeated) {
      let best = (hit.radiusX * 0.7) ** 2;
      for (let j = 0; j < field; j++) {
        if (airborne.slots[1][j]?.at >= hit.at) continue;
        const row = fieldRow(j);
        const rowY = tip - row * step;
        const spacing = Math.min(12.5, (laneHalfWidth(rowY) - 6) / Math.min(7, 2 + row));
        const rowX = 210 + fieldColumn(j) * spacing;
        const error = (x - rowX) ** 2 + (y - rowY) ** 2;
        if (error >= best) continue;
        best = error;
        slot = j;
      }
      if (slot === undefined) continue;
    }
    airborne.launch({
      at: hit.at + (i % 3) * 0.026, x, y, red: true, slot, defeated,
      vx: side * (36 + power * 106),
      vy: depth * (18 + power * 37),
      lift: 77 + power * 166,
      spin: (side < 0 ? -1 : 1) * (6 + power * 11),
      bounce: i % 4 === 2 ? 0.12 : 0.28,
      priority: hit.force > 0.45,
      intensity: 3 + power * 4,
    });
  }
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
