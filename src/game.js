import { redCleared } from "./pawtorians.js";
import { createState, resetState } from "./state.js";
import { updateArtillery } from "./artillery.js";
import { LEVEL_ONE } from "./levels.js";
import { createMultipliers } from "./multipliers.js";
import { fire, updateProjectiles } from "./projectiles.js";
import { createDanger } from "./danger.js";
import { updateArmy } from "./army.js";
import { FLAG_CAPTURE_TIME } from "./army-movement.js";

export { createBattleClock } from "./battle-clock.js";

export function createGame({
  level = LEVEL_ONE,
  notify = () => {},
  onEnd = () => {},
  random = Math.random,
  onEffect = null,
} = {}) {
  const state = createState(level);
  const rand = (a, b) => a + random() * (b - a);
  function end(won) {
    state.mode = won ? "victory" : "end";
    state.danger = createDanger();
    if (state.support) state.support.shot = null;
    if (won) onEffect?.("victory", state.t);
    else onEnd(false);
  }
  function sprinkle(x, y, color, n) {
    n = Math.min(n, 180 - state.burst.length);
    for (let k = 0; k < n; k++)
      state.burst.push({
        x,
        y,
        dx: rand(-65, 65),
        dy: rand(-95, 20),
        life: rand(0.2, 0.6),
        color,
      });
  }

  const { spawnSquad } = createMultipliers(state, sprinkle, random);
  function multiply(gate, x, y, slot, volley) {
    spawnSquad(gate, x, y, slot, volley);
    onEffect?.("multiply", state.t, gate.mult);
  }
  function reset(nextLevel = state.level, mode = "playing") {
    resetState(state, nextLevel, mode);
    if (mode === "playing") notify("HOLD THE CHOKEPOINT!", 2.2);
  }
  function update(dt) {
    if (state.mode === "victory") {
      const previous = state.victoryElapsed;
      state.victoryElapsed = Math.min(
        state.level.combat.victoryDuration,
        state.victoryElapsed + dt,
      );
      if (previous < FLAG_CAPTURE_TIME && state.victoryElapsed >= FLAG_CAPTURE_TIME)
        onEffect?.("flagCapture", state.t + FLAG_CAPTURE_TIME);
      if (state.victoryElapsed === state.level.combat.victoryDuration) {
        state.mode = "end";
        onEnd(true);
      }
      return;
    }
    if (state.mode !== "playing") return;
    state.t += dt;
    state.nextShot -= dt;
    state.recoil = Math.max(0, state.recoil - dt * 6);
    if (state.nextShot <= 0) {
      fire(state, sprinkle);
      onEffect?.("fire", state.t);
      state.nextShot += state.level.battlefield.shotInterval;
    }
    for (let i = 0; i < state.barricadeFlashes.length; i++)
      state.barricadeFlashes[i] = Math.max(0, state.barricadeFlashes[i] - dt);
    updateProjectiles(state, dt, multiply, sprinkle, notify, onEffect);
    updateArtillery(state, onEffect);
    if (redCleared(state)) {
      end(true);
      return;
    }
    updateArmy(state, dt, sprinkle, end, notify, onEffect);
    for (let j = state.burst.length - 1; j >= 0; j--) {
      const b = state.burst[j];
      b.x += b.dx * dt;
      b.y += b.dy * dt;
      b.life -= dt;
      if (b.life <= 0) state.burst.splice(j, 1);
    }
  }
  return { state, reset, update };
}
