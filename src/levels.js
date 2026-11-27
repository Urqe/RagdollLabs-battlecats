const battlefield = Object.freeze({
  width: 420,
  height: 760,
  startX: 210,
  minX: 45,
  maxX: 375,
  shotY: 608,
  shotEndY: 510,
  shotInterval: 0.28,
  marchSpeed: 104,
});

const objective = Object.freeze({ reinforcementCutoff: 100, castleFront: 690, flagY: 38 });
const combat = Object.freeze({
  initialFront: 335,
  initialBlue: 34,
  initialRed: 78,
  redReinforcements: 13.5,
  redReinforcementGrowth: 3.069,
  maxRedReinforcements: 288,
  redPressurePerCat: 0.58,
  frontage: 2400,
  marchResistance: 82.368,
  maxRedLoss: 343.2,
  maxBlueLoss: 1872,
  redLossPerBlue: 0.09324,
  redEngagementRatio: 8,
  blueLossPerRed: 0.013,
  blueContactLoss: 0.163,
  redAdvance: 21.1,
  blueAdvance: 13.7,
  reinforcementApproach: 3,
  combatEffectInterval: 0.12,
  victoryDuration: 2.4,
  // Leave room for the victory charge to reach the flag after the melee.
  minFront: objective.flagY + 12,
  maxFront: 712,
  minMarchTime: 0.25,
  arrivalOffset: 17,
  projectileSpeed: 315,
  spawnY: 532,
});

function gate(id, x, width, mult, color, style, barricadeId = null) {
  return Object.freeze({
    id,
    x,
    width,
    y: 555,
    hitY: 565,
    mult,
    name: "×" + mult,
    color,
    style,
    barricadeId,
    open: barricadeId === null,
  });
}

function barricade(id, hits, message, hitY = 545) {
  return Object.freeze({ id, hits, hitY, message });
}

const leftWood = barricade("left-gate", 90, "×25 OPEN — AIM LEFT!");
const rightWood = barricade("right-gate", 231, "×100 OPEN — AIM RIGHT!");
const compoundWood = barricade("right-gate", 231, "CHAIN OPEN — AIM RIGHT!");
const supportWood = barricade("artillery", 36, "PURRAPULT UNLEASHED!");

// Shared archer support defaults.
export const ARCHER_SUPPORT = Object.freeze({
  kind: "archers",
  id: "archers",
  barricadeId: "archers",
  x: 361,
  y: 555,
  width: 76,
  reload: 0.6,
  flight: 0.2,
  arrows: 6,
  damagePerArrow: 8,
  range: 520,
  targetDepth: 24,
  bandDepth: 100,
});

export const LEVEL_ONE = Object.freeze({
  id: "last-stand",
  number: 1,
  title: "The Last Stand",
  status: "implemented",
  battlefield,
  objective,
  combat,
  gates: Object.freeze([
    gate("starter", 210, 98, 5, "#399be9", 0),
    gate("strong", 90, 96, 25, "#ffb740", 1, leftWood.id),
    gate("final", 329, 106, 100, "#ffd561", 2, compoundWood.id),
  ]),
  relayGates: Object.freeze([
    Object.freeze({ id: "right-relay", after: "final", x: 329, width: 91, hitY: 492, mult: 3 }),
  ]),
  barricades: Object.freeze([leftWood, compoundWood]),
  support: null,
});

export const LEVEL_TWO = Object.freeze({
  id: "purrapult",
  number: 2,
  title: "The Purrapult",
  status: "implemented",
  battlefield: Object.freeze({ ...battlefield, startX: 157 }),
  objective,
  combat: Object.freeze({ ...combat, redReinforcementGrowth: 3.42 }),
  gates: Object.freeze([
    gate("starter", 157, 76, 5, "#399be9", 0),
    gate("strong", 62, 74, 25, "#ffb740", 1, leftWood.id),
    gate("final", 259, 78, 100, "#ffd561", 2, rightWood.id),
  ]),
  barricades: Object.freeze([leftWood, rightWood, supportWood]),
  support: Object.freeze({
    id: "catapult",
    barricadeId: supportWood.id,
    x: 361,
    y: 555,
    width: 76,
    reload: 2.4,
    flight: 0.94,
    openingDelay: 0.15,
    damage: 235,
    radius: 54,
    targetDepth: 32,
    bandDepth: 100,
    pocketFloor: 38,
    pocketShare: 0.23,
  }),
});

const archerWood = barricade("archers", 30, "MEOWMEN BARRAGE STARTED!");
const meowmenStrongWood = barricade("left-gate", 72, "×25 OPEN — AIM LEFT!");
const meowmenFinalWood = barricade("right-gate", 225, "×100 OPEN — AIM RIGHT!");

export const LEVEL_THREE = Object.freeze({
  id: "meowmen",
  number: 3,
  title: "The Meowmen",
  status: "implemented",
  battlefield: Object.freeze({ ...battlefield, startX: 234 }),
  objective,
  combat: Object.freeze({ ...combat, redReinforcementGrowth: 3.861 }),
  gates: Object.freeze([
    gate("starter", 234, 76, 5, "#399be9", 0),
    gate("strong", 144, 74, 25, "#ffb740", 1, meowmenStrongWood.id),
    gate("final", 340, 84, 100, "#ffd561", 2, meowmenFinalWood.id),
  ]),
  barricades: Object.freeze([meowmenStrongWood, meowmenFinalWood, archerWood]),
  support: Object.freeze({
    ...ARCHER_SUPPORT,
    x: 54,
    width: 72,
    damagePerArrow: 1,
    openingDelay: 0.1,
    reload: 0.05,
    flight: 0.19,
    range: 460,
  }),
});

const crossingObjective = Object.freeze({
  reinforcementCutoff: 120, castleFront: 510, flagY: 88,
});
const crossingCombat = {
  ...combat,
  minFront: 115,
  maxFront: 520,
  spawnY: 547,
  blueAdvance: 6.5,
  frontage: 960,
  marchResistance: 3.7248,
  maxRedLoss: 15.52,
  maxBlueLoss: 144,
  redAdvance: 9,
  redPressurePerCat: 0.66,
  redReinforcementGrowth: 0.32,
  maxRedReinforcements: 16,
  redLossPerBlue: 0.20,
  blueContactLoss: 0.12,
  reinforcementApproach: 16,
};
function siegeGate(laneId, x, width, mult, barricadeId) {
  return Object.freeze({ laneId, x, width, mult, hitY: 556,
    open: !barricadeId, barricadeId });
}

export const LEVEL_FOUR = Object.freeze({
  id: "two-tails",
  number: 4,
  title: "A Tale of Two Tails",
  status: "implemented",
  battlefield: Object.freeze({ ...battlefield, minX: 28, maxX: 392, startX: 155,
    shotInterval: 0.46, shotEndY: 548 }),
  combat: Object.freeze({ projectileSpeed: 310, victoryDuration: 3.2 }),
  defeatDuration: 0.85,
  objective: crossingObjective,
  gates: Object.freeze([
    siegeGate("left", 38, 51, null, "phalanx"),
    siegeGate("left", 96, 54, 25, "left"),
    siegeGate("left", 155, 58, 5),
    siegeGate("right", 214, 58, 5),
    siegeGate("right", 280, 64, 25, "right"),
    siegeGate("right", 362, 80, 100, "siege"),
  ]),
  barricades: Object.freeze([
    barricade("phalanx", 132, "MEOWRTANS RELEASED", 570),
    barricade("left", 30, "LEFT ×25 OPEN", 570),
    barricade("right", 30, "RIGHT ×25 OPEN", 570),
    barricade("siege", 51, "RIGHT ×100 OPEN", 570),
  ]),
  crossings: Object.freeze({
    left: Object.freeze({
      combat: Object.freeze({ ...crossingCombat, initialFront: 335, initialRed: 81,
        minFront: 265, frontage: 72, marchResistance: 3.1872, maxBlueLoss: 54.4, maxRedLoss: 13.28, redAdvance: 12, blueContactLoss: 0.17,
        redReinforcements: 2.4, redReinforcementGrowth: 0.90, maxRedReinforcements: 128 }),
      objective: crossingObjective, marchSpeed: 175, initialBlue: 38,
    }),
    right: Object.freeze({
      combat: Object.freeze({ ...crossingCombat, initialFront: 350, initialRed: 92,
        blueAdvance: 5.1, redAdvance: 10, redReinforcements: 6.24, redReinforcementGrowth: 0.62,
        maxRedReinforcements: 48, marchResistance: 9.024, maxRedLoss: 48, redLossPerBlue: 0.17, redLossPerDefender: 3,
        redPressurePerCat: 0.65, blueContactLoss: 0.075 }),
      objective: crossingObjective, marchSpeed: 175, initialBlue: 48,
    }),
  }),
  phalanx: Object.freeze({ marchTime: 2.4, deployTime: 1.15, pushSpeed: 30, holdFront: 308,
    deployPressure: 60.8, queueCapacity: 272 }),
  support: null,
});

const candidates = [
  ["pawtorians", "The Pawtorians"],
  ["clawlossus", "The Clawlossus"],
  ["cavalpurry", "The Cavalpurry"],
  ["catastrophe", "The Great Catastrophe"],
  ["meowhem", "General Meowhem"],
  ["cattledonia", "The Battle of Cattledonia"],
];

export const LEVELS = Object.freeze([
  LEVEL_ONE,
  LEVEL_TWO,
  LEVEL_THREE,
  LEVEL_FOUR,
  ...candidates.map(([id, title], index) =>
    Object.freeze({ id, title, number: index + 5, status: "proposed" }),
  ),
]);

export function playableLevel(id) {
  return LEVELS.find(
    (level) => level.id === id && level.status === "implemented",
  );
}
