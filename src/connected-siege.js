import { casualtyRates } from "./lane-combat.js";

// Distances are route units. The rendering layer can map each leg independently.
const entry = ["castleEntry", "rearJunction", 8];
const westApproach = ["rearJunction", "westRally", 14];
const eastApproach = ["rearJunction", "eastContact", 22];
export const siegeRoutes = Object.freeze({
  westEntry: [entry, westApproach],
  eastEntry: [entry, eastApproach],
  withdrawal: [["westContact", "westRally", 6],
    ["westRally", "rearJunction", 14], eastApproach],
  westRally: [["westRally", "rearJunction", 14], eastApproach],
  encirclement: [["eastCommand", "ridgePass", 36], ["ridgePass", "westRear", 42]],
});

export const connectedSiegeRules = Object.freeze({
  marchSpeed: 16,
  impactInterval: 0.4,
  surgeEvery: 5,
  surgeIntensity: 1.7,
  surgePressure: 0.75,
  spearLossRate: 8,
  flankShare: 0.6,
  rearRedLossCap: 140,
  routLossShare: 0.25,
  routAdvantage: 2,
});

function position(cohort) {
  const [from, to, distance] = siegeRoutes[cohort.route][cohort.leg];
  return { ...cohort, from, to, progress: cohort.distance / distance };
}

function move(cohort, distance, onWaypoint) {
  const legs = siegeRoutes[cohort.route];
  cohort.distance += distance;
  while (cohort.distance + 1e-9 >= legs[cohort.leg][2]) {
    cohort.distance -= legs[cohort.leg][2];
    if (cohort.leg === legs.length - 1) {
      cohort.distance = legs[cohort.leg][2];
      return true;
    }
    cohort.leg++;
    cohort.distance = Math.max(0, cohort.distance);
    onWaypoint?.();
  }
  return false;
}

function startRoute(cohort, route, time) {
  return Object.assign(cohort, { route, leg: 0, distance: 0, departedAt: time });
}

export function createConnectedSiege(state, wall, rules) {
  function reset() {
    state.siege = {
      phase: "twoFronts",
      transfers: [],
      flank: null,
      nextImpact: 0,
      impacts: 0,
      breakthrough: false,
      mainAdvance: {
        from: "eastContact",
        to: "eastCommand",
        startFront: state.lanes.right.combat.initialFront,
        endFront: state.lanes.right.objective.reinforcementCutoff,
      },
    };
  }

  function routeVolley(squad) {
    const redirected = squad.laneId === "left" && state.phalanx.phase === "secured";
    const destination = redirected ? "right" : squad.laneId;
    squad.gateLane = squad.laneId;
    squad.laneId = destination;
    startRoute(squad, destination === "left" ? "westEntry" : "eastEntry", state.time);
  }

  function transfer(cohort, route, emit, front) {
    const moving = startRoute({ id: cohort.id, count: cohort.count }, route, state.time);
    state.siege.transfers.push(moving);
    emit?.("left", "infantryWithdrawal", { ...position(moving), front });
  }

  function secure(left, emit) {
    state.siege.phase = "rightOffensive";
    const previousFront = left.front;
    left.front = wall.holdFront;
    emit?.("left", "frontline", { previousFront, front: left.front });
    if (left.blueTotal > 0) {
      const count = left.blueTotal;
      left.blueTotal = 0;
      transfer({ id: "west-infantry", count }, "withdrawal", emit, previousFront);
    }
  }

  function march(lane, dt, emit) {
    let pending = 0;
    for (const squad of lane.squads) {
      if (squad.departedAt === state.time || !move(squad, rules.marchSpeed * dt)) {
        lane.squads[pending++] = squad;
      } else if (lane.id === "left" && state.phalanx.phase === "secured") {
        transfer(squad, "westRally", emit);
      } else {
        lane.blueTotal += squad.count;
        emit?.(lane.id, "arrival", { ...position(squad), side: "blue", front: lane.front });
      }
    }
    lane.squads.length = pending;
  }

  function advanceTransfers(right, dt, emit) {
    const { transfers } = state.siege;
    let pending = 0;
    for (const cohort of transfers) {
      const arrived = move(cohort, rules.marchSpeed * dt, () =>
        emit?.("right", "transferProgress", position(cohort)));
      if (arrived) {
        right.blueTotal += cohort.count;
        emit?.("right", "transferArrival", position(cohort));
      } else {
        transfers[pending++] = cohort;
      }
    }
    transfers.length = pending;
  }

  function hold(left, dt, emit) {
    const { siege, time } = state;
    const { redReinforcements, redReinforcementGrowth, maxRedReinforcements } = left.combat;
    const rate = Math.min(maxRedReinforcements, redReinforcements + redReinforcementGrowth * time);
    const count = left.redEntryOpen
      ? Math.min(Math.max(0, wall.queueCapacity - left.redTotal), rate * dt)
      : 0;
    left.redEntryRate = count / dt;
    left.redTotal += count;
    if (count > 0) emit?.("left", "arrival", { side: "red", count, front: left.front });
    if (left.redTotal === 0 || time < siege.nextImpact) return;

    siege.nextImpact = time + rules.impactInterval;
    const pressure = Math.min(1, left.redTotal / wall.queueCapacity);
    const surge = ++siege.impacts % rules.surgeEvery === 0 && pressure >= rules.surgePressure;
    const intensity = (0.25 + 0.75 * pressure) * (surge ? rules.surgeIntensity : 1);
    const redLost = Math.min(left.redTotal, rules.spearLossRate * rules.impactInterval * pressure);
    left.redTotal -= redLost;
    const repelled = Math.min(Math.floor(left.redTotal), Math.ceil(10 * intensity));
    emit?.("left", "shieldImpact", { front: left.front, surge, intensity, repelled });
    emit?.("left", "spearThrust", { front: left.front, intensity, redLost });
    if (redLost > 0) emit?.("left", "casualties", { front: left.front, redLost, blueLost: 0 });
  }

  function advanceOffensive(left, right, dt, emit) {
    const { siege, time } = state;
    if (state.phalanx.phase !== "secured" || right.redEntryOpen || right.redTotal > 0) return;
    if (!siege.breakthrough) {
      siege.breakthrough = true;
      left.redEntryOpen = false;
      left.redEntryRate = 0;
      emit?.("right", "mainBreakthrough", { front: right.front, count: right.blueTotal,
        waypoint: "eastCommand" });
    }
    if (!siege.flank) {
      const count = Math.floor(right.blueTotal * rules.flankShare);
      if (!count) return;
      right.blueTotal -= count;
      siege.phase = "flanking";
      siege.flank = startRoute({ id: "flank", count }, "encirclement", time);
      emit?.("right", "encirclementStarted", position(siege.flank));
      return;
    }

    const { flank } = siege;
    if (siege.phase === "flanking") {
      if (move(flank, rules.marchSpeed * dt, () =>
        emit?.("left", "encirclementProgress", position(flank)))) {
        siege.phase = "encirclement";
        siege.rearInitialRed = left.redTotal;
        siege.rearRedLost = 0;
        siege.nextRearAttack = time;
        emit?.("left", "encirclementArrival", position(flank));
      }
      return;
    }

    if (time < siege.nextRearAttack) return;
    siege.nextRearAttack = time + rules.impactInterval;
    // The open rear allows more frontage than the bridge, but both losses
    // remain contact-limited. Resolve one exchange per presentation pulse.
    const rates = casualtyRates(flank.count, left.redTotal, {
      ...left.combat, maxRedLoss: rules.rearRedLossCap,
    });
    const redLost = Math.min(left.redTotal, rates.red * rules.impactInterval);
    const blueLost = Math.min(flank.count, rates.blue * rules.impactInterval);
    left.redTotal -= redLost;
    flank.count -= blueLost;
    siege.rearRedLost += redLost;
    const contact = { waypoint: "westRear", front: left.front, redLost, blueLost };
    if (redLost > 0 || blueLost > 0) {
      emit?.("left", "rearAttack", { ...contact, id: flank.id, count: flank.count });
      emit?.("left", "casualties", contact);
    }
    if (left.redTotal > 0 && siege.rearRedLost >= siege.rearInitialRed * rules.routLossShare &&
        flank.count >= left.redTotal * rules.routAdvantage) {
      state.retreat = { count: left.redTotal };
      left.redTotal = 0;
      emit?.("left", "enemyRouted", { ...state.retreat, waypoint: "westRear" });
    }
    if (left.redTotal === 0) {
      siege.phase = "victory";
      state.outcome = "victory";
      emit?.("left", "victory", { waypoint: "westRear", count: flank.count });
    } else if (flank.count === 0) {
      siege.flank = null;
      siege.phase = "rightOffensive";
    }
  }

  return { reset, routeVolley, secure, march, advanceTransfers, hold, advanceOffensive };
}
