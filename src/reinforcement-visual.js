import { FIELD_LIMIT, RESERVE_LIMIT, fieldColumn, fieldRow } from "./army-visual.js";

export const DETAILED_RESERVES = 144;

export const DETAILED_WAVES = 6;
export const RECEIVING_DETAIL_LIMIT = 36;

export function createReinforcementVisual() {
  const field = Array(FIELD_LIMIT).fill(null);
  const reserve = Array(RESERVE_LIMIT).fill(null);
  let reserveOwners = 0;
  let fieldCapacity = 0;
  let reserveCapacity = 0;

  function reset() {
    field.fill(null);
    reserve.fill(null);
    reserveOwners = fieldCapacity = reserveCapacity = 0;
  }

  function setCapacity(target) {
    for (let i = target.field; i < fieldCapacity; i++) releaseSlot(field, i);
    for (let i = target.reserve; i < reserveCapacity; i++) releaseSlot(reserve, i);
    fieldCapacity = target.field;
    reserveCapacity = target.reserve;
  }

  function releaseSlot(slots, index) {
    const member = slots[index];
    if (!member) return;
    slots[index] = null;
    if (slots === reserve) reserveOwners--;
    // A cat that hasn't reached its rank still has a journey to complete.
    if (member.settled) member.retired = true;
    else member.assigned = false;
  }

  function admit(cohort, count, fromField, fromReserve, target) {
    cohort.members = Array.from({ length: count }, (_, index) => ({
      cohort, index, assigned: false, settled: false,
    }));
    let f = fromField;
    let r = Math.max(0, Math.min(fromReserve, target.reserve - DETAILED_RESERVES));
    for (const member of cohort.members) {
      while (f < target.field && field[f]) f++;
      if (f < target.field) {
        field[f++] = member;
      } else if (reserveOwners < DETAILED_RESERVES) {
        while (r < target.reserve && reserve[r]) r++;
        if (r >= target.reserve) break;
        reserve[r++] = member;
        reserveOwners++;
      } else break;
      member.assigned = true;
    }
    fieldCapacity = Math.max(fieldCapacity, target.field);
    reserveCapacity = Math.max(reserveCapacity, target.reserve);
  }

  function replenish(slot, fieldCount, reserveCount, remaining = fieldCount) {
    if (slot >= fieldCount) return null;
    const casualty = field[slot];
    if (casualty) {
      releaseSlot(field, slot);
      casualty.settled = casualty.retired = true;
    }
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
    const recruit = reserve.findIndex((member, index) => index < reserveCount && member?.settled);
    field[previous] = recruit < 0 ? null : reserve[recruit];
    if (recruit >= 0) {
      field[previous].moving = true;
      reserve[recruit] = null;
      reserveOwners--;
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
