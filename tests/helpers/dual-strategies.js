export const dualStrategies = [
  "west-camping", "east-camping", "even-alternation", "phalanx-rush",
  "west-only", "east-siege-first", "double-upgrade", "adaptive",
  "flank-first", "no-siege", "skip-west99", "skip-east99", "no-phalanx",
  "adaptive-seven", "adaptive-imperfect", "starter-fed-rush", "sustained-starter-rush",
];

export function dualAim(strategy, second, lanes, gates, phalanx) {
  if (strategy === "adaptive-imperfect") {
    if (second === 17 || second === 39 || second === 67) return (gates[2].x + gates[3].x) / 2;
    return dualAim("double-upgrade", second, lanes, gates, phalanx) + (second % 2 ? 10 : -10);
  }
  const double = ["double-upgrade", "adaptive", "no-siege", "skip-west99", "skip-east99"].includes(strategy);
  const rhythm = strategy === "adaptive" ? 9 : double ? 8 : strategy === "adaptive-seven" ? 7 : 6;
  const [wall, west99, west20, east20, east99, east999] = gates;
  if (strategy === "west-camping") return west20.x;
  if (strategy === "east-camping") return east20.x;
  if (strategy === "even-alternation") return (second % 4 < 2 ? west20 : east20).x;
  if (strategy === "starter-fed-rush" || strategy === "sustained-starter-rush") {
    const westSeconds = strategy === "starter-fed-rush" ? 2 : 5;
    const eastSeconds = strategy === "starter-fed-rush" ? 5 : 3;
    if (second < westSeconds + eastSeconds) return (second < westSeconds ? west20 : east20).x;
    return dualAim("phalanx-rush", second, lanes, gates, phalanx);
  }
  if (strategy === "phalanx-rush") {
    if (!wall.open) return wall.x;
    if (!east99.open) return east99.x;
    return (!east999.open && lanes.right.front > 420 && second % 6 < 3 ? east99 : east999).x;
  }
  if (strategy === "west-only") return (!west99.open || wall.open ? west99 : wall).x;
  if (strategy === "east-siege-first") return east999.x;

  const west = west99.open ? west99 : west20;
  const east = east99.open ? east99 : east20;
  const { left, right } = lanes;
  const westRisk = left.front + 0.039 * Math.max(0, left.redTotal - left.blueTotal);
  const eastRisk = right.front + 0.042 * Math.max(0, right.redTotal - right.blueTotal);
  const window = second % (phalanx.phase === "secured" && double ? 7 : rhythm);

  if (phalanx.phase === "secured") {
    if (strategy === "no-siege" && east99.open) return east99.x;
    if (strategy !== "skip-east99" && !east99.open)
      return (eastRisk >= 432 && window < 3 ? (west99.open ? west99 : east20) : east99).x;
    if (!east999.open && eastRisk >= 413 && window < 3) return east.x;
    return east999.x;
  }
  if (strategy === "flank-first") {
    if (second < 4) return (second < 2 ? west20 : east20).x;
    if (!west99.open) return (second % 5 === 1 ? east20 : west99).x;
    if (window < 2 && left.front > 340) return west99.x;
    if (window === 2 || window === 3) return east20.x;
    return (wall.open ? (left.front > 435 ? west99 : east20) : wall).x;
  }
  if (second < 6) return (second % 4 < 2 ? west20 : east20).x;

  if (double) {
    if (!west99.open && strategy !== "skip-west99") return (window === 2 ? east : west99).x;
    if (!east99.open && strategy !== "skip-east99") return (window < 2 ? west : east99).x;
    if (window < 2) return (westRisk > eastRisk || left.front > 435 ? west : east).x;
    if (window === 2 || (window === 3 && eastRisk > 455)) return east.x;
    return (wall.open ? (westRisk > eastRisk ? west : east) : wall).x;
  }

  const dynamic = strategy === "adaptive-seven";
  const westDanger = westRisk >= 445;
  const eastDanger = eastRisk >= 437;
  if ((westDanger || eastDanger) && window < (dynamic ? 4 : 3))
    return (eastRisk > westRisk ? east : west).x;

  if (!west99.open && strategy !== "skip-west99") return (window === 2 ? east : west99).x;
  if (!east99.open && strategy !== "skip-east99")
    return (window < 2 ? west : east99).x;

  if (strategy === "no-phalanx") return (westRisk >= eastRisk ? west : east).x;
  if (window < 2) return (dynamic && eastRisk > westRisk ? east : west).x;
  if (window === 2) return east.x;
  if (wall.open) return (westRisk > eastRisk ? west : east).x;
  return wall.x;
}
