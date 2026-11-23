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
  initialRed: 2225,
  redReinforcements: 150,
  redReinforcementGrowth: 34.1,
  maxRedReinforcements: 3200,
  redPressurePerCat: 0.075,
  maxRedLoss: 4400,
  redLossPerBlue: 0.111,
  redEngagementRatio: 8,
  blueLossPerRed: 0.013,
  blueContactLoss: 0.163,
  redAdvance: 21.1,
  blueAdvance: 13.7,
  reinforcementApproach: 3,
  combatEffectInterval: 0.12,
  victoryDuration: 2.4,
  minFront: 25,
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

const leftWood = barricade("left-gate", 90, "×99 OPEN — AIM LEFT!");
const rightWood = barricade("right-gate", 231, "×999 OPEN — AIM RIGHT!");
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
    gate("starter", 210, 98, 20, "#399be9", 0),
    gate("strong", 90, 96, 99, "#ffb740", 1, leftWood.id),
    gate("final", 329, 106, 999, "#ffd561", 2, rightWood.id),
  ]),
  barricades: Object.freeze([leftWood, rightWood]),
  support: null,
});

export const LEVEL_TWO = Object.freeze({
  id: "purrapult",
  number: 2,
  title: "The Purrapult",
  status: "implemented",
  battlefield: Object.freeze({ ...battlefield, startX: 157 }),
  objective,
  combat: Object.freeze({ ...combat, redReinforcementGrowth: 38 }),
  gates: Object.freeze([
    gate("starter", 157, 76, 20, "#399be9", 0),
    gate("strong", 62, 74, 99, "#ffb740", 1, leftWood.id),
    gate("final", 259, 78, 999, "#ffd561", 2, rightWood.id),
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
    damage: 3400,
    radius: 54,
    targetDepth: 32,
    bandDepth: 100,
    pocketFloor: 550,
    pocketShare: 0.23,
  }),
});

const archerWood = barricade("archers", 30, "MEOWMEN BARRAGE STARTED!");
const meowmenStrongWood = barricade("left-gate", 72, "×99 OPEN — AIM LEFT!");
const meowmenFinalWood = barricade("right-gate", 225, "×999 OPEN — AIM RIGHT!");

export const LEVEL_THREE = Object.freeze({
  id: "meowmen",
  number: 3,
  title: "The Meowmen",
  status: "implemented",
  battlefield: Object.freeze({ ...battlefield, startX: 234 }),
  objective,
  combat: Object.freeze({ ...combat, redReinforcementGrowth: 55 }),
  gates: Object.freeze([
    gate("starter", 234, 76, 20, "#399be9", 0),
    gate("strong", 144, 74, 99, "#ffb740", 1, meowmenStrongWood.id),
    gate("final", 340, 84, 999, "#ffd561", 2, meowmenFinalWood.id),
  ]),
  barricades: Object.freeze([meowmenStrongWood, meowmenFinalWood, archerWood]),
  support: Object.freeze({
    ...ARCHER_SUPPORT,
    x: 54,
    width: 72,
    damagePerArrow: 25,
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
  maxRedLoss: 97,
  redAdvance: 9,
  redPressurePerCat: 0.66,
  redReinforcementGrowth: 2,
  maxRedReinforcements: 100,
  redLossPerBlue: 0.20,
  blueContactLoss: 0.12,
  reinforcementApproach: 16,
};
const laneIds = ["left", "right"];

export const LEVEL_FOUR = Object.freeze({
  id: "two-tails",
  number: 4,
  title: "A Tale of Two Tails",
  status: "implemented",
  battlefield: Object.freeze({ ...battlefield, minX: 30, maxX: 390, startX: 166,
    shotInterval: 0.46, shotEndY: 548 }),
  combat: Object.freeze({ projectileSpeed: 310, victoryDuration: 3.2 }),
  defeatDuration: 0.85,
  objective: crossingObjective,
  gates: Object.freeze(laneIds.flatMap((laneId, i) => [
    Object.freeze({ laneId, x: i ? 254 : 166, width: 84, mult: 20, hitY: 556, open: true }),
    Object.freeze({ laneId, x: i ? 352 : 68, width: 84, mult: 60, hitY: 556,
      open: false, barricadeId: laneId }),
  ])),
  barricades: Object.freeze(laneIds.map(id => barricade(id, 42, "STRONG GATE OPEN", 570))),
  crossings: Object.freeze({
    left: Object.freeze({
      combat: Object.freeze({ ...crossingCombat, initialFront: 335, initialRed: 460, redReinforcements: 33 }),
      objective: crossingObjective, marchSpeed: 175, initialBlue: 225,
    }),
    right: Object.freeze({
      combat: Object.freeze({ ...crossingCombat, initialFront: 350, initialRed: 490, redReinforcements: 35 }),
      objective: crossingObjective, marchSpeed: 175, initialBlue: 225,
    }),
  }),
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
