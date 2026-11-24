import { pathToFileURL } from "node:url";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { CROSSINGS } from "../src/dual-front.js";
import { createState } from "../src/state.js";
import { dualAim, dualStrategies } from "../tests/helpers/dual-strategies.js";

export function simulateDual(strategy, hz, { useSiege = true, connected = false, onEvent } = {}) {
  const state = createState();
  const unlocked = {};
  const battle = createDualBattlefield({
    state, connected, onEvent,
    onEffect(type, time) {
      if (type !== "break") return;
      for (const gate of state.gates) {
        if (gate.barricadeId && gate.open) unlocked[gate.barricadeId] ??= time;
      }
    },
  });
  battle.reset();
  const { lanes, phalanx } = battle.state;
  for (let second = 0; second < 150 && !battle.state.outcome; second++) {
    const aim = dualAim(strategy, second, lanes, state.gates, phalanx);
    const east99 = state.gates.find(gate => gate.laneId === "right" && gate.mult === 99);
    state.gunX = !useSiege && phalanx.phase === "secured" && east99.open ? east99.x : aim;
    for (let frame = 0; frame < hz && !battle.state.outcome; frame++) battle.advance(1 / hz);
  }
  return {
    strategy,
    outcome: battle.state.outcome,
    duration: state.t,
    breached: CROSSINGS.filter(id => lanes[id].breached),
    unlocked,
    securedAt: phalanx.phase === "secured" ? phalanx.since : null,
    supplyCutoffAt: Number.isFinite(battle.feedback.right.cutoffAt) ? battle.feedback.right.cutoffAt : null,
    retreated: battle.state.retreat?.count ?? 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const connected = process.argv.includes("--connected");
  console.log(JSON.stringify([30, 60, 120].map(hz => ({
    hz, strategies: dualStrategies.map(strategy => simulateDual(strategy, hz, { connected })),
  })), null, 2));
}
