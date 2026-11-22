import { clamp } from "./config.js";
import { updateArchers } from "./archers.js";

export function activateArtillery(state) {
  state.support.unlockedAt = state.t;
  state.support.readyAt = state.t + state.level.support.reload;
}

export function updateArtillery(state, onEffect) {
  const { support, level, front, t } = state;
  if (state.mode !== "playing" || !support?.open) return;
  const config = level.support;
  if (config.kind === "archers") return updateArchers(state, onEffect);
  const bandTop = Math.max(level.combat.minFront, front - config.bandDepth);
  const shot = support.shot;
  if (shot) {
    if (t < shot.impactAt) return;
    support.shot = null;
    support.readyAt = shot.impactAt + config.reload;
    const overlap = Math.max(
      0,
      Math.min(shot.y + config.radius, front) -
        Math.max(shot.y - config.radius, bandTop),
    );
    const coverage = clamp(
      overlap / Math.min(config.radius, front - bandTop || 1),
      0,
      1,
    );
    const loss = Math.min(
      state.redTotal,
      config.damage * coverage,
      config.pocketFloor + state.redTotal * config.pocketShare,
    );
    state.redTotal -= loss;
    support.damage += loss;
    support.impacts++;
    support.impact = { x: shot.x, y: shot.y, at: t, loss };
    if (loss > 0) onEffect?.("artilleryImpact", t, support.impact);
    return;
  }
  if (t < support.readyAt || state.redTotal <= 0) return;
  support.shot = {
    x: level.battlefield.width / 2,
    y: clamp(front - config.targetDepth, bandTop, front),
    launchedAt: t,
    impactAt: t + config.flight,
  };
  support.shotsFired++;
  onEffect?.("artilleryLaunch", t);
}
