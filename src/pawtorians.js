// A single finite cohort. Marching troops are outside the engaged red total.
export function createPawtorians(config) {
  return config ? {
    y: config.entryY,
    spawnedAt: null,
    arrivedAt: null,
    count: 0,
    ordinaryArrivals: 0,
    melee: { ordinary: 0, armored: 0 },
    artillery: { ordinary: 0, armored: 0 },
  } : null;
}

export function marchPawtorians(state, dt) {
  const wave = state.pawtorians;
  if (!wave || wave.arrivedAt !== null) return;
  const config = state.level.pawtorians;
  if (wave.spawnedAt === null) {
    if (state.t < config.spawnAt || !state.redEntryOpen) return;
    wave.spawnedAt = state.t;
    wave.count = config.population;
  }
  const contact = state.front - config.contactOffset;
  wave.y = Math.min(contact, wave.y + config.marchSpeed * dt);
  if (wave.y < contact) return;
  wave.arrivedAt = state.t;
  state.redTotal += wave.count;
}

export function engagedArmor(state) {
  const wave = state.pawtorians;
  return wave?.arrivedAt != null ? wave.count : 0;
}

export function redQuality(state) {
  const armored = engagedArmor(state);
  return armored > 0 ? 1 + armored / state.redTotal * (state.level.pawtorians.effectiveness - 1) : 1;
}

export function ordinaryRed(state) {
  return state.redTotal - engagedArmor(state);
}

export function redCleared(state) {
  return !state.redEntryOpen && state.redTotal === 0 && !state.pawtorians?.count;
}

export function removeRed(state, budget, source) {
  const wave = state.pawtorians;
  if (!wave) {
    const lost = Math.min(state.redTotal, budget);
    state.redTotal -= lost;
    return lost;
  }
  const armored = engagedArmor(state);
  const ordinary = state.redTotal - armored;
  const config = state.level.pawtorians;
  const artillery = source === "artillery";
  const exposure = artillery ? config.artilleryExposure : 1;
  const weight = ordinary + armored * exposure;
  const share = weight > 0 ? armored * exposure / weight : 0;
  const armoredLost = Math.min(armored, budget * share * (artillery ? 1 : config.meleeDamageTaken));
  // Artillery can spend unused splash on either population in the same pocket.
  const ordinaryLost = Math.min(ordinary, artillery ? budget - armoredLost : budget * (1 - share));
  const armorLoss = artillery ? Math.min(armored, budget - ordinaryLost) : armoredLost;
  wave.count -= armorLoss;
  wave[source].armored += armorLoss;
  wave[source].ordinary += ordinaryLost;
  // Keep the total and the armor subset consistent when either pool empties.
  state.redTotal = (ordinary - ordinaryLost) + engagedArmor(state);
  return ordinaryLost + armorLoss;
}
