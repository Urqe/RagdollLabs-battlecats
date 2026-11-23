export const dualStrategies = [
  "west-camping", "east-camping", "even-alternation",
  "threat-responsive", "upgrade-focused", "mixed",
];

const starterX = [166, 254];
const upgradeX = [68, 352];

export function dualAim(strategy, second, lanes, gates) {
  if (strategy === "west-camping") return starterX[0];
  if (strategy === "east-camping") return starterX[1];
  if (strategy === "even-alternation") return starterX[Math.floor(second / 5) % 2];

  function pressure(lane) {
    if (!lane.redEntryOpen && lane.redTotal === 0) return -Infinity;
    const red = lane.redTotal * lane.combat.redPressurePerCat;
    return lane.front + 70 * (red - lane.blueTotal) / (red + lane.blueTotal || 1);
  }
  const needy = Number(pressure(lanes.right) > pressure(lanes.left));
  if (strategy === "threat-responsive") return starterX[needy];

  const nextUpgrade = gates[1].open ? 1 : 0;
  if (gates[1].open && gates[3].open) return upgradeX[needy];
  if (strategy === "upgrade-focused") return upgradeX[nextUpgrade];

  const lane = needy ? lanes.right : lanes.left;
  return second >= 6 && second % 12 < 7 && lane.front < 425
    ? upgradeX[nextUpgrade] : starterX[needy];
}
