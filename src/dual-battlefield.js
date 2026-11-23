import { createAirborneCats } from "./airborne-cats.js";
import { CROSSINGS, createDualFront } from "./dual-front.js";
import { LEVEL_ONE } from "./levels.js";
import { fire, updateProjectiles } from "./projectiles.js";
import { resetState } from "./state.js";

export const crossings = {
  left: { center: 112, edge: 22, width: 180, name: "WEST CROSSING" },
  right: { center: 308, edge: 218, width: 180, name: "EAST CROSSING" },
};

const gates = CROSSINGS.flatMap((laneId, i) => [
  { laneId, x: i ? 254 : 166, width: 84, mult: 20, hitY: 556, open: true },
  { laneId, x: i ? 352 : 68, width: 84, mult: 65, hitY: 556,
    open: false, barricadeId: laneId },
]);

export const fixtureLevel = {
  id: "dual-crossing-fixture",
  number: 4,
  title: "A Tale of Two Tails",
  battlefield: { ...LEVEL_ONE.battlefield, minX: 30, maxX: 390, startX: 166,
    shotInterval: 0.46, shotEndY: 548 },
  combat: { projectileSpeed: 310 },
  gates,
  barricades: CROSSINGS.map(id => ({ id, hits: 15, hitY: 570 })),
  support: null,
};

const objective = { reinforcementCutoff: 120, castleFront: 510 };
const combat = {
  ...LEVEL_ONE.combat,
  minFront: 115,
  maxFront: 520,
  spawnY: 547,
  blueAdvance: 37,
  redAdvance: 25,
  redPressurePerCat: 0.66,
  redReinforcementGrowth: 2,
  maxRedReinforcements: 125,
  redLossPerBlue: 0.24,
  blueContactLoss: 0.10,
  reinforcementApproach: 72,
};

export const fixtureDefinitions = {
  left: { combat: { ...combat, initialFront: 310, initialRed: 390, redReinforcements: 40 },
    objective, marchSpeed: 175, initialBlue: 310 },
  right: { combat: { ...combat, initialFront: 378, initialRed: 530, redReinforcements: 68 },
    objective, marchSpeed: 175, initialBlue: 260 },
};

const ignore = () => {};
const freshFeedback = () => ({
  direction: 0, reversedAt: -Infinity, redIntake: 0, redPulse: -Infinity,
  redPending: 0, clashAt: -Infinity, contact: -Infinity, launchAt: -Infinity,
  arrivalAt: -Infinity, cutoffAt: -Infinity, breachAt: -Infinity,
  danger: false, dangerAt: -Infinity, blueLost: 0, redLost: 0,
  flights: createAirborneCats(4),
});

export function createDualBattlefield({ state, onEnd = ignore, onEffect = ignore }) {
  const feedback = {};
  const battle = createDualFront(fixtureDefinitions, { beforeTick: updateCannon, onEvent: receive, afterTick: updateFeedback });

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
      state.nextShot += fixtureLevel.battlefield.shotInterval;
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
      const danger = lane.breached || (lane.front >= lane.objective.castleFront -
        (local.danger ? 100 : 78) && local.direction > 0);
      if (danger && !local.danger) local.dangerAt = time;
      local.danger = danger;
    }
    if (battle.state.outcome) {
      state.mode = "end";
      state.shots.length = 0;
      for (const id of CROSSINGS) feedback[id].flights.reset();
      onEnd(battle.state.outcome === "victory");
    }
  }

  function clear() {
    battle.clear();
    state.shots.length = 0;
    state.dragId = null;
    state.mode = "menu";
    state.recoil = 0;
    for (const id of CROSSINGS) feedback[id] = freshFeedback();
  }

  function reset() {
    clear();
    battle.reset();
    resetState(state, fixtureLevel, "playing");
    state.nextShot = 0.15;
  }

  return {
    state: battle.state, feedback, reset, clear,
    get paused() { return battle.clock.paused; },
    pause: battle.clock.pause, resume: battle.clock.resume,
    advance(dt) {
      if (state.mode !== "playing") return;
      battle.advance(dt);
    },
  };
}
