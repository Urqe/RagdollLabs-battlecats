import { clamp } from "./config.js";
import { armyScale, fieldRow, FIELD_LIMIT, LITERAL_ARMY } from "./army-visual.js";

export function createArmyPresentation() {
  return {
    population: null,
    occupationMass: 0,
    target: {},
    field: 0,
    reserve: 0,
    fieldExtent: 0,
    reserveExtent: 0,
    rows: 0,
    recoil: 0,
    compression: 0,
    collapseAge: Infinity,
  };
}

export function resetArmyPresentation(army) {
  army.population = null;
  army.occupationMass = 0;
  army.field = army.reserve = army.fieldExtent = army.reserveExtent = 0;
  army.rows = army.recoil = army.compression = 0;
  army.collapseAge = Infinity;
}

function settle(value, target, dt, response) {
  const next = target + (value - target) * Math.exp(-dt / response);
  return Math.abs(next - target) < 0.08 ? target : next;
}

export function rowsAt(count) {
  const slot = clamp(count - 1, 0, FIELD_LIMIT - 1);
  const left = Math.floor(slot);
  return fieldRow(left) + (fieldRow(Math.ceil(slot)) - fieldRow(left)) * (slot - left);
}

export function stepArmyPresentation(army, population, dt, easeSmallArrivals = false) {
  const before = army.population;
  const { field, reserve } = armyScale(population, army.target);
  army.population = population;

  if (before === null) {
    army.occupationMass = population;
    army.field = army.fieldExtent = field;
    army.reserve = army.reserveExtent = reserve;
    army.rows = rowsAt(field);
    return;
  }

  army.occupationMass = settle(army.occupationMass, population, dt, 0.38);
  const oldField = army.field;
  const oldReserve = army.reserve;
  const loss = Math.max(0, (before - population) / Math.max(1, before));
  army.recoil = Math.max(army.recoil * Math.exp(-dt / 0.22), clamp(loss * 2, 0, 1));
  army.compression = settle(army.compression, army.recoil, dt, 0.085);
  // Literal armies lose whole slots immediately. Elsewhere only living
  // capacity is clamped, and departed slots fall on a separate clock.
  army.field = (population <= LITERAL_ARMY && !easeSmallArrivals) || field <= oldField
    ? field
    : settle(oldField, field, dt, population <= LITERAL_ARMY ? 0.105 : 0.22);
  army.reserve = reserve <= oldReserve ? reserve : settle(oldReserve, reserve, dt, 0.38);

  const lostSlots = Math.max(0, oldReserve - army.reserve) +
    (before > LITERAL_ARMY ? Math.max(0, oldField - army.field) : 0);
  const hadBodies = army.fieldExtent > oldField || army.reserveExtent > oldReserve;
  army.collapseAge = lostSlots > 0 && (!hadBodies || lostSlots >= Math.max(6, (oldField + oldReserve) * 0.045))
    ? 0
    : army.collapseAge + dt;
  const decayTime = army.collapseAge < 0.052 ? 0 : dt;
  const collapse = 0.14 - army.recoil * 0.043;

  army.fieldExtent = Math.max(
    army.field,
    before > LITERAL_ARMY && oldField > army.field ? oldField : 0,
    settle(army.fieldExtent, army.field, decayTime, collapse),
  );
  army.reserveExtent = Math.max(
    army.reserve,
    oldReserve > army.reserve ? oldReserve : 0,
    settle(army.reserveExtent, army.reserve, decayTime, collapse),
  );
  if (before <= LITERAL_ARMY && population <= LITERAL_ARMY && army.fieldExtent <= oldField)
    army.fieldExtent = army.field;
  army.rows = settle(army.rows, rowsAt(army.fieldExtent), dt, 0.15);
}

// Coverage is fractional at the retreating edge, even when a sprite goes
// from a whole cached tile to a partial row. An inactive slot never attacks.
export function slotCoverage(extent, index) {
  return clamp(extent - index, 0, 1);
}

export function collapsePose(age) {
  const progress = clamp(age / 0.22, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

export function retirementOpacity(living, extent, index, pose) {
  const depth = Math.max(1, (extent - living) * 0.52);
  const edge = Math.min(1, (extent - index) / depth);
  return (0.91 - pose * 0.32) * (1 - (1 - edge) * pose * 0.64) *
    slotCoverage(extent, index);
}
