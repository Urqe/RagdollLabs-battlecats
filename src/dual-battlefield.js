import { createAirborneCats } from "./airborne-cats.js";
import { CROSSINGS, createDualFront } from "./dual-front.js";
import { FLAG_CAPTURE_TIME } from "./army-movement.js";
import { LEVEL_FOUR } from "./levels.js";
import { fire, updateProjectiles } from "./projectiles.js";
import { resetState } from "./state.js";

export const crossings = {
  left: { center: 112, edge: 22, width: 180, name: "WEST CROSSING" },
  right: { center: 308, edge: 218, width: 180, name: "EAST CROSSING" },
};

const ignore = () => {};
const freshFeedback = () => ({
  direction: 0, reversedAt: -Infinity, redIntake: 0, redPulse: -Infinity,
  redPending: 0, clashAt: -Infinity, contact: -Infinity, launchAt: -Infinity,
  arrivalAt: -Infinity, cutoffAt: -Infinity, breachAt: -Infinity,
  danger: false, blueLost: 0, redLost: 0,
  flights: createAirborneCats(4),
});

export function createDualBattlefield({ state, onEnd = ignore, onEffect = ignore }) {
  const feedback = {};
  const battle = createDualFront(LEVEL_FOUR.crossings, {
    beforeTick: updateCannon, onEvent: receive, afterTick: updatePresentation,
  });

  function receive(event) {
    const local = feedback[event.laneId];
    switch (event.type) {
      case "launch":
        local.launchAt = event.time;
        break;
      case "arrival":
        if (event.side === "blue") local.arrivalAt = event.time;
        else local.redPending += event.count;
        break;
      case "casualties":
        local.redLost += event.redLost;
        local.blueLost += event.blueLost;
        break;
      case "clash":
        local.contact = event.time;
        break;
      case "frontline": {
        const direction = Math.sign(event.front - event.previousFront);
        if (local.direction && local.direction !== direction) local.reversedAt = event.time;
        local.direction = direction;
        break;
      }
      case "supplyCutoff":
        local.cutoffAt = event.time;
        break;
      case "breach":
        local.breachAt = event.time;
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
    }, ignore, ignore, onEffect);
  }

  function updateFeedback() {
    const { time, lanes } = battle.state;
    for (const id of CROSSINGS) {
      const lane = lanes[id];
      const local = feedback[id];
      const { center } = crossings[id];
      local.flights.step(time);
      if (time - local.redPulse >= 0.34) {
        local.redPulse = time;
        local.redIntake = local.redPending;
        local.redPending = 0;
      }
      if (time - local.clashAt >= 0.24 && (local.blueLost || local.redLost)) {
        local.clashAt = time;
        for (const red of [false, true]) {
          const key = red ? "redLost" : "blueLost";
          if (local[key] < 1) continue;
          const side = red ? 1 : -1;
          local.flights.launch({ at: time, x: center + Math.sin(time * 19) * 38,
            y: lane.front - side * 6, vx: side * 40, vy: -side * 31,
            lift: 65, spin: side * 8, bounce: 0.23, red, defeated: true });
          local[key] %= 1;
        }
      }
      // Hysteresis keeps the alert from flashing repeatedly near the threshold.
      const danger = lane.breached || lane.front >= lane.objective.castleFront - 32 ||
        (lane.front >= lane.objective.castleFront - (local.danger ? 92 : 78) &&
          (local.danger || local.direction > 0));
      local.danger = danger;
    }
  }

  function updatePresentation(dt) {
    if (state.mode === "playing") {
      updateFeedback();
      if (!battle.state.outcome) return;
      state.shots.length = 0;
      for (const id of CROSSINGS) feedback[id].flights.reset();
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
