import { clamp } from "./config.js";
import { laneHalfWidth } from "./terrain.js";

export const PAWTORIAN_SLOT_START = 512;
const COLUMNS = 11;
const RANK_SPACING = 12;
const LIMIT = COLUMNS * 7;

export function armorExtent(count, population) {
  // Preserve the leading representatives as casualties thin the rear ranks.
  return Math.min(count, LIMIT * Math.sqrt(count / population));
}

export function armorDepth(extent) {
  return Math.ceil(extent / COLUMNS) * RANK_SPACING;
}

export function armorPosition(index, lead) {
  const row = Math.floor(index / COLUMNS);
  const column = index % COLUMNS;
  const y = lead - row * RANK_SPACING - (column % 2) * 1.6;
  const half = Math.min(78, Math.max(12, laneHalfWidth(y) - 9) * 0.82);
  const rank = Math.ceil(column / 2) * (column % 2 ? -1 : 1);
  return { x: 210 + rank * half / 5, y, half, row };
}

export function launchArmorImpact(airborne, hit, { loss, remaining, population, lead }) {
  const living = Math.ceil(armorExtent(remaining, population));
  const prior = Math.ceil(armorExtent(remaining + loss, population));
  const defeated = Math.min(2, prior - living);
  const candidates = [];
  for (let i = 0; i < prior; i++) {
    const { x, y } = armorPosition(i, lead);
    const cross = (x - hit.x) / hit.radiusX;
    const depth = (y - hit.y) / hit.radiusY;
    const distance = cross * cross + depth * depth;
    if (distance <= 1) candidates.push({ i, x, y, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  let retired = 0;
  let launched = 0;
  for (const { i, x, y } of candidates) {
    if (launched >= 4) break;
    const lost = i >= living;
    if (lost && retired >= defeated) continue;
    const side = x < hit.x ? -1 : 1;
    if (airborne.launch({
      at: hit.at, x, y, red: true, armored: true, defeated: lost, priority: true,
      slot: lost ? undefined : PAWTORIAN_SLOT_START + i, fromImpact: true,
      vx: side * (42 + hit.force * 65), vy: clamp((y - hit.y) * 1.8, -65, 65),
      lift: 90 + hit.force * 105, spin: side * 9, bounce: 0.21, intensity: 6,
    })) {
      retired += Number(lost);
      launched++;
    }
  }
}
