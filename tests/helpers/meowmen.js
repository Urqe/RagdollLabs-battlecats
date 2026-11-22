import { LEVEL_THREE } from "../../src/levels.js";

export function meowmenAim(strategy) {
  const [starter, strong, final] = LEVEL_THREE.gates.map(({ x }) => x);
  const crew = LEVEL_THREE.support.x;
  let strongAt;
  let finalAt;
  return (state) => {
    const { t, gates, support } = state;
    if (gates[1].open) strongAt ??= t;
    if (gates[2].open) finalAt ??= t;
    if (strategy === "starter") return starter;
    if (strategy === "support-only") return crew;
    if (strategy === "final-rush") return final;
    if (strategy === "archer-first" && !support.open) return crew;
    if (strategy === "gates-first" && finalAt !== undefined && !support.open &&
        t >= finalAt + 2) return crew;
    if (finalAt !== undefined) return final;
    if (strongAt === undefined) {
      if (strategy === "archer-first") return strong;
      return t < 6 || (t - 6) % 4 < 1 ? starter : strong;
    }

    const balanced = strategy === "balanced";
    const reserveUntil = strongAt + (balanced ? 3 : 5);
    if (t < reserveUntil) return strong;
    if (balanced && !support.open) return crew;
    const finalWork = t - Math.max(reserveUntil, support.unlockedAt ?? 0);
    return finalWork % 5 < (balanced ? 1.5 : 2) ? strong : final;
  };
}
