import { clamp } from "./config.js";

export const LITERAL_ARMY = 100;
export const FIELD_LIMIT = 232;
export const RESERVE_LIMIT = 1600;
export const RESERVE_GROUP = 6;
export const RESERVE_ROWS = 25;
export const ENTRY_LIMIT = 30;

const rows = new Uint8Array(FIELD_LIMIT);
const columns = new Int8Array(FIELD_LIMIT);
let slot = 0;
for (let row = 0; slot < FIELD_LIMIT; row++) {
  const width = Math.min(15, 5 + row * 2);
  for (let col = 0; col < width && slot < FIELD_LIMIT; col++, slot++) {
    rows[slot] = row;
    columns[slot] = (col % 2 ? 1 : -1) * Math.ceil(col / 2);
  }
}

export const fieldRow = (index) => rows[index];
export const fieldColumn = (index) => columns[index];

export function armyScale(population, scale = {}) {
  const count = Math.ceil(Math.max(0, population));
  const extra = count - LITERAL_ARMY;
  if (extra <= 0) {
    scale.field = count;
    scale.reserve = 0;
    return scale;
  }
  scale.field = LITERAL_ARMY +
    Math.floor((FIELD_LIMIT - LITERAL_ARMY) * -Math.expm1(-extra / 182));
  scale.reserve = Math.min(
    count - scale.field,
    Math.ceil(
      260 * -Math.expm1(-extra / 1850) +
      410 * -Math.expm1(-extra / 20500) +
      930 * -Math.expm1(-extra / 145000),
    ),
  );
  return scale;
}

export function entryRepresentation(reserve, rate, timeSinceCutoff) {
  const activity = clamp(rate / 370, 0, 1);
  const remain = clamp(1 - timeSinceCutoff / 0.65, 0, 1);
  return Math.floor(Math.min(reserve * 0.22, ENTRY_LIMIT) * activity * remain);
}

export function encounterBalance(own, opposing) {
  return opposing > 0 && own > 0 ? (own - opposing) / (own + opposing) : 0;
}

// Local exchanges use visible numbers. The actual frontline is never adjusted.
export function encounterOffset(time, index, row, red, balance, pressure, force) {
  if (row > 2) return 0;
  const rhythm = Math.sin(time * 10 + index * 1.23 + (red ? 0 : Math.PI));
  const lunge = Math.max(0, rhythm) * (3.3 + 3.2 * Math.max(0, balance));
  const recoil =
    Math.max(0, -rhythm) * (2.5 + 3.9 * Math.max(0, -balance)) + force;
  return (lunge - recoil + pressure * 2.2) * (1 - row * 0.31);
}
