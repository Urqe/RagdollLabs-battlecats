// Experimental overrides for the original Milestone 22 definitions.
const candidates = {
  moderate: {
    tiers: [5, 25, 100], initialBlue: 34, initialRed: 78,
    intake: 0.09, frontage: 0.03, casualties: 0.078, support: 0.069,
    west: [38, 81], east: [48, 92], crossingIntake: 0.16,
  },
  aggressive: {
    tiers: [3, 10, 50], initialBlue: 22, initialRed: 48,
    intake: 0.027, frontage: 0.013, casualties: 0.035, support: 0.03,
    west: [22, 42], east: [28, 54], crossingIntake: 0.09,
  },
};

export function scaleCandidate(level, name) {
  if (name === "baseline") return level;
  const c = candidates[name];
  const scaleCombat = (rules, crossing = false) => ({
    ...rules,
    initialBlue: c.initialBlue,
    initialRed: c.initialRed,
    redPressurePerCat: crossing ? rules.redPressurePerCat : 0.58,
    frontage: rules.frontage * (crossing ? c.crossingIntake : c.frontage),
    marchResistance: rules.marchResistance * (crossing ? c.crossingIntake : c.casualties),
    redReinforcements: rules.redReinforcements * (crossing ? c.crossingIntake : c.intake),
    redReinforcementGrowth: rules.redReinforcementGrowth * (crossing ? c.crossingIntake : c.intake) * (level.number === 3 ? 0.78 : 1),
    maxRedReinforcements: rules.maxRedReinforcements * (crossing ? c.crossingIntake : c.intake),
    maxBlueLoss: rules.maxBlueLoss * (crossing ? c.crossingIntake : c.casualties),
    maxRedLoss: rules.maxRedLoss * (crossing ? c.crossingIntake : c.casualties),
    redLossPerBlue: rules.redLossPerBlue * (crossing ? 1 : 0.84),
  });
  const [starter, strong, final] = c.tiers;
  const tiers = { 20: starter, 99: strong, 999: final };
  const gates = level.gates.map(g => g.mult ? { ...g, mult: tiers[g.mult], name: "×" + tiers[g.mult] } : g);
  if (level.crossings) {
    const crossings = Object.fromEntries(Object.entries(level.crossings).map(([id, lane]) => {
      const [initialBlue, initialRed] = id === "left" ? c.west : c.east;
      return [id, { ...lane, initialBlue, combat: { ...scaleCombat(lane.combat, true), initialRed } }];
    }));
    return { ...level, gates, crossings, phalanx: { ...level.phalanx,
      deployPressure: level.phalanx.deployPressure * c.crossingIntake,
      queueCapacity: level.phalanx.queueCapacity * c.crossingIntake } };
  }
  const { support } = level;
  return { ...level, gates, combat: scaleCombat(level.combat),
    support: !support ? null : support.kind === "archers"
      ? { ...support, damagePerArrow: Math.max(1, Math.floor(support.damagePerArrow * c.support)) }
      : { ...support, damage: Math.round(support.damage * c.support), pocketFloor: Math.round(support.pocketFloor * c.support) } };
}
