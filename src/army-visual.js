import { clamp } from "./config.js";

export const LITERAL_ARMY = 150;
export const CROSSING_LITERAL_ARMY = 112;
export const FIELD_LIMIT = 252;
export const RESERVE_LIMIT = 720;
export const RESERVE_GROUP = 6;
export const RESERVE_ROWS = 25;
export const ENTRY_LIMIT = 30;

const rows = new Uint8Array(FIELD_LIMIT);
const columns = new Int8Array(FIELD_LIMIT);
let slot = 0;
for (let row = 0; slot < FIELD_LIMIT; row++) {
  const width = fieldColumns(row);
  for (let col = 0; col < width && slot < FIELD_LIMIT; col++, slot++) {
    rows[slot] = row;
    columns[slot] = (col % 2 ? 1 : -1) * Math.ceil(col / 2);
  }
}

export function fieldColumns(row) {
  return Math.min(17, 9 + row * 2);
}

// The slot order is center-out. Growing formations open their shoulders
// before reserve mass extends the footprint behind them.
export function fieldSpacing(half, row, field, pitch) {
  const columns = (fieldColumns(row) - 1) / 2;
  const maturity = clamp((field - 18) / 158, 0, 1);
  const compact = Math.min(pitch, half / columns);
  return compact + (half / columns - compact) * maturity * (row ? 0.86 : 1);
}

export const fieldRow = (index) => rows[index];
export const fieldColumn = (index) => columns[index];

export function armyScale(population, scale = {}, literal = LITERAL_ARMY, limit = FIELD_LIMIT) {
  const count = Math.ceil(Math.max(0, population));
  const extra = Math.max(0, count - literal);
  scale.field = count - extra +
    Math.floor((limit - literal) * -Math.expm1(-extra / 185));
  scale.reserve = Math.min(count - scale.field, Math.ceil(
    110 * -Math.expm1(-extra / 520) +
    230 * -Math.expm1(-extra / 3600) +
    380 * -Math.expm1(-extra / 18000),
  ));
  return scale;
}

export function entryRepresentation(reserve, rate, timeSinceCutoff) {
  const activity = clamp(rate / 36, 0, 1);
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
