import { createState, resetState } from "./state.js";
import { rand, SHOT_INTERVAL } from "./config.js";
import { createMultipliers } from "./multipliers.js";
import { fire, updateProjectiles } from "./projectiles.js";
import { updateArmy } from "./army.js";
export function createGame({ notify = () => {}, onEnd = () => {} } = {}) {
  const state = createState();
  function end(won) {
    state.mode = "end";
    onEnd(won);
  }
  function sprinkle(x, y, color, n) {
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

  const { spawnSquad } = createMultipliers(state, sprinkle, notify);
  function reset() {
    resetState(state);
    notify("HOLD THE CHOKEPOINT!", 2.2);
  }
  function update(dt) {
    if (state.mode !== "playing") return;
    state.t += dt;
    state.nextShot -= dt;
    state.flash = Math.max(0, state.flash - dt * 4);
    if (state.nextShot <= 0) {
      fire(state, sprinkle);
      state.nextShot += SHOT_INTERVAL;
    }
    for (let i = 0; i < 2; i++)
      state.barricadeFlashes[i] = Math.max(0, state.barricadeFlashes[i] - dt);
    updateProjectiles(state, dt, spawnSquad, sprinkle, notify);
    updateArmy(state, dt, sprinkle, end);
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
