import { createDanger } from "./danger.js";
import { LEVEL_ONE } from "./levels.js";
export function createState(level = LEVEL_ONE) {
  const { battlefield, combat } = level;
  const mode = "menu",
    t = 0,
    gunX = battlefield.startX,
    dragId = null,
    dragStart = 0,
    gunStart = 0,
    nextShot = 0,
    front = combat.initialFront,
    redTotal = combat.initialRed,
    blueTotal = combat.initialBlue ?? 0,
    work = level.barricades.map(() => 0),
    recoil = 0,
    shots = [],
    squads = [],
    burst = [],
    finalActivated = false,
    bannerUntil = 0,
    barricadeFlashes = level.barricades.map(() => 0);
  const gates = level.gates.map((gate) => ({ ...gate }));
  return {
    level,
    support: level.support
      ? {
          open: false,
          readyAt: null,
          shot: null,
          impact: null,
          unlockedAt: null,
          shotsFired: 0,
          impacts: 0,
          damage: 0,
        }
      : null,
    mode,
    t,
    gunX,
    dragId,
    dragStart,
    gunStart,
    nextShot,
    front,
    redTotal,
    blueTotal,
    redEntryRate: 0,
    redEntryOpen: true,
    advanceMode: "contested",
    frontVelocity: 0,
    bluePressure: 0,
    redPressure: 0,
    victoryElapsed: 0,
    danger: createDanger(),
    redRecentLoss: 0,
    blueRecentLoss: 0,
    nextCombatEffect: combat.combatEffectInterval,
    work,
    recoil,
    shots,
    squads,
    burst,
    finalActivated,
    bannerUntil,
    barricadeFlashes,
    gates,
  };
}
export function resetState(state, level = state.level, mode = "playing") {
  Object.assign(state, createState(level), { mode, nextShot: 0.1 });
}
