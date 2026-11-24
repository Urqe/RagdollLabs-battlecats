import { CROSSINGS, createDualFront } from "./dual-front.js";
import { FLAG_CAPTURE_TIME } from "./army-movement.js";
import { LEVEL_FOUR } from "./levels.js";
import { fire, updateProjectiles } from "./projectiles.js";
import { resetState } from "./state.js";

const ignore = () => {};
const freshFeedback = () => ({
  direction: 0, arrivalAt: -Infinity, cutoffAt: -Infinity, danger: false,
});

export function createDualBattlefield({ state, onEnd = ignore, onEffect = ignore, onEvent }) {
  const feedback = {};
  const battle = createDualFront(LEVEL_FOUR.crossings, {
    beforeTick: updateCannon, onEvent: receive, afterTick: updatePresentation,
    phalanx: LEVEL_FOUR.phalanx,
  });

  function receive(event) {
    onEvent?.(event, battle.state);
    const local = feedback[event.laneId];
    switch (event.type) {
      case "arrival":
        if (event.side === "blue") local.arrivalAt = event.time;
        break;
      case "transferArrival":
        local.arrivalAt = event.time;
        break;
      case "frontline":
        local.direction = Math.sign(event.front - event.previousFront);
        break;
      case "supplyCutoff":
        local.cutoffAt = event.time;
        break;
    }
  }

  function updateCannon(dt) {
    state.t = battle.state.time;
    state.nextShot -= dt;
    state.recoil = Math.max(0, state.recoil - dt * 6);
    if (state.nextShot <= 0) {
      fire(state, ignore);
      onEffect("fire", state.t);
      state.nextShot += state.level.battlefield.shotInterval;
    }
    for (let i = 0; i < state.barricadeFlashes.length; i++)
      state.barricadeFlashes[i] = Math.max(0, state.barricadeFlashes[i] - dt);
    updateProjectiles(state, dt, (gate, x) => {
      gate.flashAt = state.t;
      battle.launchVolley(gate.laneId, { multiplier: gate.mult, hits: 1, origin: x });
      onEffect("multiply", state.t, gate.mult);
    }, ignore, ignore, (type, time, target) => {
      if (type === "break" && target === "phalanx") battle.unlockPhalanx();
      onEffect(type, time, target);
    });
  }

  function updateFeedback() {
    const { lanes } = battle.state;
    for (const id of CROSSINGS) {
      const lane = lanes[id];
      const local = feedback[id];
      // Hysteresis keeps the alert from flashing repeatedly near the threshold.
      const danger = lane.breached || lane.front >= lane.objective.castleFront - 32 ||
        (lane.front >= lane.objective.castleFront - (local.danger ? 92 : 78) &&
          (local.danger || local.direction > 0));
      local.danger = danger && !(id === "left" && ["pushing", "secured"].includes(battle.state.phalanx.phase));
    }
  }

  function updatePresentation(dt) {
    if (state.mode === "playing") {
      updateFeedback();
      if (!battle.state.outcome) return;
      state.shots.length = 0;
      state.mode = battle.state.outcome;
      if (state.mode === "victory") onEffect("victory", state.t);
      return;
    }
    if (state.mode !== "victory" && state.mode !== "defeat") return;
    const won = state.mode === "victory";
    const previous = state.victoryElapsed;
    const duration = won ? state.level.combat.victoryDuration : state.level.defeatDuration;
    const elapsed = Math.min(duration, (won ? previous : state.defeatElapsed) + dt);
    if (won) {
      state.victoryElapsed = elapsed;
      if (previous < FLAG_CAPTURE_TIME && elapsed >= FLAG_CAPTURE_TIME)
        onEffect("flagCapture", state.t + FLAG_CAPTURE_TIME);
    } else {
      state.defeatElapsed = elapsed;
    }
    if (elapsed === duration) {
      state.mode = "end";
      onEnd(won);
    }
  }

  function clear() {
    battle.clear();
    state.shots.length = 0;
    state.dragId = null;
    state.mode = "menu";
    delete state.defeatElapsed;
    state.recoil = 0;
    for (const id of CROSSINGS) feedback[id] = freshFeedback();
  }

  function reset() {
    clear();
    battle.reset();
    resetState(state, LEVEL_FOUR, "playing");
    state.defeatElapsed = 0;
    state.nextShot = 0.15;
  }

  return {
    state: battle.state, feedback, reset, clear,
    get paused() { return battle.clock.paused; },
    pause: battle.clock.pause, resume: battle.clock.resume,
    advance(dt) {
      if (state.mode === "menu" || state.mode === "end") return;
      battle.advance(dt);
    },
  };
}
