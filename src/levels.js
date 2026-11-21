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

const objective = Object.freeze({ reinforcementCutoff: 100, castleFront: 690 });
const combat = Object.freeze({
  initialFront: 335,
  initialRed: 2225,
  redReinforcements: 150,
  redReinforcementGrowth: 34.1,
  maxRedReinforcements: 3200,
  redPressurePerCat: 0.04,
  maxRedLoss: 4400,
  redLossPerBlue: 0.111,
  blueLossPerRed: 0.013,
  blueContactLoss: 0.163,
  redAdvance: 21.1,
  blueAdvance: 13.7,
  reinforcementApproach: 3,
  combatEffectInterval: 0.12,
  victoryDuration: 1.5,
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
const supportWood = barricade("artillery", 36, "PURRAPULT CREW READY!");

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
    reload: 3.3,
    flight: 0.94,
    damage: 2850,
    radius: 37,
    targetDepth: 32,
    bandDepth: 100,
    pocketFloor: 350,
    pocketShare: 0.2,
  }),
});

const candidates = [
  ["meowmen", "The Meowmen"],
  ["two-tails", "A Tale of Two Tails"],
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
  ...candidates.map(([id, title], index) =>
    Object.freeze({ id, title, number: index + 3, status: "proposed" }),
  ),
]);

export function playableLevel(id) {
  return LEVELS.find(
    (level) => level.id === id && level.status === "implemented",
  );
}
