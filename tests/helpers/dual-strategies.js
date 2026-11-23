export const dualStrategies = [
  "west-camping", "east-camping", "even-alternation", "west-upgrade",
  "east-siege-first", "phalanx-rush", "flank-first", "mixed",
];

export function dualAim(strategy, second, lanes, gates, phalanx) {
  const [wall, west99, west20, east20, east99, east999] = gates;
  if (strategy === "west-camping") return west20.x;
  if (strategy === "east-camping") return east20.x;
  if (strategy === "even-alternation") return (second % 4 < 2 ? west20 : east20).x;
  if (strategy === "east-siege-first") return east999.x;
  if (strategy === "phalanx-rush") return wall.x;
  if (strategy === "west-upgrade") {
    if (second < 4) return west20.x;
    if (!west99.open) return west99.x;
    return (second % 3 < 2 ? east20 : west99).x;
  }

  const mixed = strategy === "mixed";
  const east = east99.open ? east99 : east20;
  const danger = mixed ? 370 : 425;
  if (phalanx.phase === "secured") {
    if (!east99.open) return (lanes.right.front >= danger ? east20 : east99).x;
    if (!east999.open && lanes.right.front >= danger - 5 && second % 5 >= 1) return east99.x;
    return east999.x;
  }

  const early = mixed ? [west20, west20, east20, east20] : [east20, east20, west20, west20, east20];
  if (second < early.length) return early[second].x;
  if (!west99.open) return west99.x;
  const window = second % 6;
  if (mixed && !east99.open && window >= 2) return east99.x;
  if (window < 2 || (lanes.left.front >= 433 && second % 3 === 0)) return west99.x;
  if (window === 2 || (lanes.right.front >= danger && window === 3)) return east.x;
  if (!wall.open) return wall.x;
  return (lanes.right.front >= danger ? east : west99).x;
}
