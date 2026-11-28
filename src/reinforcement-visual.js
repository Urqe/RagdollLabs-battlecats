import { FIELD_LIMIT, RESERVE_LIMIT, fieldColumn, fieldRow } from "./army-visual.js";

const DETAILED_RESERVES = 144;

export const DETAILED_WAVES = 6;

export function createReinforcementVisual() {
  const field = Array(FIELD_LIMIT).fill(null);
  const reserve = Array(RESERVE_LIMIT).fill(null);

  function reset() {
    field.fill(null);
    reserve.fill(null);
  }

  function setCapacity(target) {
    for (let i = target.field; i < field.length; i++) if (field[i]) retire(field, i);
    for (let i = target.reserve; i < reserve.length; i++) if (reserve[i]) retire(reserve, i);
  }

  function retire(slots, index) {
    slots[index].settled = true;
    slots[index].retired = true;
    slots[index] = null;
  }

  function admit(cohort, count, fromField, fromReserve, target) {
    cohort.members = Array.from({ length: count }, (_, index) => ({
      cohort, index, assigned: false, settled: false,
    }));
    const freeField = Math.max(0, target.field - fromField);
    const freeReserve = Math.max(0, target.reserve - fromReserve);
    const reserveStart = freeReserve >= count - freeField
      ? fromReserve : Math.max(0, target.reserve - DETAILED_RESERVES);
    let f = fromField;
    let r = reserveStart;
    for (const member of cohort.members) {
      while (f < target.field && field[f]) f++;
      while (r < target.reserve && reserve[r]) r++;
      if (f < target.field) field[f++] = member;
      else if (r < target.reserve) reserve[r++] = member;
      else continue;
      member.assigned = true;
    }
    let detailed = 0;
    for (let i = reserve.length - 1; i >= 0; i--) {
      const member = reserve[i];
      if (member && ++detailed > DETAILED_RESERVES) {
        if (member.settled) retire(reserve, i);
        else {
          member.assigned = false;
          reserve[i] = null;
        }
      }
    }
  }

  function replenish(slot, fieldCount, reserveCount, remaining = fieldCount) {
    if (slot >= fieldCount) return null;
    const casualty = field[slot];
    if (casualty) retire(field, slot);
    const column = fieldColumn(slot);
    let previous = slot;
    for (let next = slot + 1; next < fieldCount; next++) {
      if (fieldRow(next) === fieldRow(previous) || fieldColumn(next) !== column) continue;
      field[previous] = field[next];
      if (field[previous]) field[previous].moving = true;
      previous = next;
    }
    if (previous < remaining && remaining < fieldCount && field[fieldCount - 1] && previous !== fieldCount - 1) {
      field[previous] = field[fieldCount - 1];
      field[previous].moving = true;
      field[fieldCount - 1] = null;
      return casualty;
    }
    const recruit = reserve.findIndex(member => member?.settled);
    field[previous] = recruit < 0 ? null : reserve[recruit];
    if (recruit >= 0 && recruit < reserveCount) {
      field[previous].moving = true;
      reserve[recruit] = null;
    }
    return casualty;
  }

  return { field, reserve, reset, setCapacity, admit, replenish };
}

// World-space pursuit is bounded even when a rank moves to new territory.
export function approachFormation(member, x, y, seconds) {
  const dx = x - member.x;
  const dy = y - member.y;
  const distance = Math.hypot(dx, dy);
  const fraction = distance ? Math.min(1, seconds * 135 / distance) : 1;
  member.x += dx * fraction;
  member.y += dy * fraction;
  return fraction === 1;
}
