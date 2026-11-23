import { pathToFileURL } from "node:url";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { CROSSINGS } from "../src/dual-front.js";
import { createState } from "../src/state.js";
import { dualAim, dualStrategies } from "../tests/helpers/dual-strategies.js";

export function simulateDual(strategy, hz) {
  const state = createState();
  const gateUnlockedAt = { left: null, right: null };
  const battle = createDualBattlefield({
    state,
    onEffect(type, time) {
      if (type !== "break") return;
      for (const gate of state.gates) {
        if (gate.barricadeId && gate.open)
          gateUnlockedAt[gate.laneId] ??= time;
      }
    },
  });
  battle.reset();
  const { lanes } = battle.state;
  const secondsAimed = { left: 0, right: 0 };
  for (let second = 0; second < 150 && !battle.state.outcome; second++) {
    state.gunX = dualAim(strategy, second, lanes, state.gates);
    const target = state.gates.find(gate => gate.x === state.gunX);
    const start = state.t;
    for (let frame = 0; frame < hz && !battle.state.outcome; frame++) {
      battle.advance(1 / hz);
    }
    if (target.open) {
      const ready = target.barricadeId ? gateUnlockedAt[target.laneId] : start;
      secondsAimed[target.laneId] += state.t - Math.max(start, ready);
    }
  }
  return {
    strategy,
    outcome: battle.state.outcome,
    duration: state.t,
    breached: CROSSINGS.filter(id => lanes[id].breached),
    crossings: Object.fromEntries(CROSSINGS.map(id => [id, {
      blue: lanes[id].blueTotal,
      red: lanes[id].redTotal,
      gateUnlockedAt: gateUnlockedAt[id],
      supplyCutoffAt: Number.isFinite(battle.feedback[id].cutoffAt) ? battle.feedback[id].cutoffAt : null,
      secondsAimed: secondsAimed[id],
    }])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = [30, 60, 120].map(hz => ({
    hz,
    strategies: dualStrategies.map(strategy => simulateDual(strategy, hz)),
  }));
  console.log(JSON.stringify(results, null, 2));
}
