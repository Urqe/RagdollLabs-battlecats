import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { siegePopulation } from "../src/connected-siege.js";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { CROSSINGS } from "../src/dual-front.js";
import { createState } from "../src/state.js";
import { dualAim, dualStrategies } from "../tests/helpers/dual-strategies.js";

export function simulateDual(strategy, hz, { onEvent } = {}) {
  const state = createState();
  const unlocked = {};
  const digest = createHash("sha256");
  let securedAt = null, deployingAt = null, breakthroughAt = null, encirclementAt = null;
  let lockAt = null, blueLaunched = 0, blueArrivals = 0, blueCasualties = 0;
  let withdrawal = 0, transferred = 0, redCasualties = 0;
  const battle = createDualBattlefield({
    state,
    onEvent(event, sim) {
      digest.update(JSON.stringify(event) + "\n");
      switch (event.type) {
        case "launch": blueLaunched += event.count; break;
        case "arrival":
          if (event.side === "blue") blueArrivals += event.count;
          break;
        case "phalanxPushing": lockAt = event.time; break;
        case "phalanxDeploying": deployingAt = event.time; break;
        case "phalanxSecured": securedAt = event.time; break;
        case "mainBreakthrough": breakthroughAt = event.time; break;
        case "encirclementStarted": encirclementAt = event.time; break;
        case "infantryWithdrawal":
          if (event.id === "west-infantry") withdrawal = event.count;
          break;
        case "transferArrival": transferred += event.count; break;
        case "casualties":
          redCasualties += event.redLost;
          blueCasualties += event.blueLost;
          break;
        case "frontline":
          furthest[event.laneId] = Math.max(furthest[event.laneId], event.front);
          break;
      }
      onEvent?.(event, sim);
    },
    onEffect(type, time) {
      if (type !== "break") return;
      for (const gate of state.gates) {
        if (gate.barricadeId && gate.open) unlocked[gate.barricadeId] ??= time;
      }
    },
  });
  battle.reset();
  const { lanes, phalanx } = battle.state;
  const furthest = { left: lanes.left.front, right: lanes.right.front };
  const trajectory = [];
  for (let second = 0; second < 240 && !battle.state.outcome; second++) {
    state.gunX = dualAim(strategy, second, lanes, state.gates, phalanx);
    for (let frame = 0; frame < hz && !battle.state.outcome; frame++) battle.advance(1 / hz);
    if ((second + 1) % 5 === 0 || battle.state.outcome)
      trajectory.push([battle.state.time, lanes.left.front, lanes.right.front]);
  }
  const { outcome, time } = battle.state;
  const { blue: survivingBlue } = siegePopulation(battle.state);
  return {
    strategy, outcome, duration: time,
    breached: CROSSINGS.filter(id => lanes[id].breached),
    unlocked, deployingAt, lockAt, securedAt, blueLaunched, blueArrivals, blueCasualties, trajectory,
    supplyCutoffAt: Number.isFinite(battle.feedback.right.cutoffAt) ? battle.feedback.right.cutoffAt : null,
    breakthroughAt,
    encirclementDuration: outcome === "victory" ? time - encirclementAt : null,
    survivingBlue, withdrawal, transferred, redCasualties, retreated: battle.state.retreat?.count ?? 0,
    furthest, eventDigest: digest.digest("hex"),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify([30, 60, 120].map(hz => ({
    hz, strategies: dualStrategies.map(strategy => simulateDual(strategy, hz)),
  })), null, 2));
}
