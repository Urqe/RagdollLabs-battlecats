// One aggregate volley; no per-arrow agents or splash damage.
export function updateArchers(state, onEffect) {
  const { support, level, t, front } = state;
  const config = level.support;
  const epsilon = 1e-9;
  const inRange = (y) => Math.abs(config.y - y) <= config.range;
  const bandTop = Math.max(level.combat.minFront, front - config.bandDepth);
  const shot = support.shot;
  if (shot) {
    if (t + epsilon < shot.impactAt) return;
    support.shot = null;
    support.readyAt = shot.impactAt + config.reload;
    const hit = state.redTotal > 0 && inRange(shot.y) &&
      shot.y >= bandTop && shot.y <= front;
    const loss = hit ? Math.min(state.redTotal, shot.arrows * config.damagePerArrow) : 0;
    state.redTotal -= loss;
    support.damage += loss;
    support.impacts++;
    support.impact = { ...shot, at: shot.impactAt, loss };
    // Misses resolve too, so presentation can retire every volley.
    onEffect?.("archerImpact", shot.impactAt, { ...support.impact });
  }
  const y = Math.max(bandTop, front - config.targetDepth);
  if (state.redTotal <= 0 || !inRange(y)) {
    // No stored volleys or catch-up burst when targets return.
    support.readyAt = Math.max(support.readyAt, t);
    return;
  }
  if (t + epsilon < support.readyAt) return;
  const launchedAt = support.readyAt;
  support.shot = {
    x: level.battlefield.width / 2,
    y,
    originX: config.x,
    originY: config.y,
    arrows: Math.min(12, Math.max(1, Math.floor(config.arrows))),
    launchedAt,
    impactAt: launchedAt + config.flight,
  };
  support.shotsFired++;
  onEffect?.("archerLaunch", launchedAt, { ...support.shot });
}
