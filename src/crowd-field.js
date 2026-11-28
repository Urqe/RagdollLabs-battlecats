import { clamp } from "./config.js";
import { smoothStep } from "./army-movement.js";

// Occupation is local to a formation. The caller supplies the live line and
// the furthest legal rear edge, including both sides of an encirclement.
export function crowdReach(available, population, retreat = 0) {
  const depth = 0.45 + 0.55 * smoothStep((Math.log1p(population) - 6) / 4.3);
  return Math.max(0, available) * depth * (1 - 0.36 * clamp(retreat, 0, 1));
}

export function crowdSeam(front, lateral, balance, activity) {
  if (!activity) return front;
  const x = clamp(lateral, -1, 1);
  const taper = 1 - x * x;
  return front + activity * taper * (Math.sin(x * 6) * 2.4
    + Math.cos(x * 9) * balance * 2.2);
}

export function crowdRank(span, row, rows, bend) {
  const fraction = (row + 0.5) / rows;
  return span * (fraction + bend * fraction * (1 - fraction));
}

// Static center-out offsets keep tile seams irregular without moving ranks.
export function crowdColumn(column, row, pitch) {
  const slot = (column % 2 ? 1 : -1) * Math.ceil(column / 2);
  const stagger = (row % 2 - 0.5) * pitch * 0.24;
  return slot * pitch + stagger + Math.sin(row * 1.73 + column * 2.39) * 1.4;
}
