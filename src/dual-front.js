import { connectedSiegeRules, createConnectedSiege } from "./connected-siege.js";
import { createBattleClock } from "./battle-clock.js";
import { advanceLaneCombat, marchSquad } from "./lane-combat.js";

export const CROSSINGS = Object.freeze(["left", "right"]);

function createLane(id, { combat, objective, marchSpeed, initialBlue = 0 }) {
  return {
    id,
    combat,
    objective,
    marchSpeed,
    front: combat.initialFront,
    blueTotal: initialBlue,
    redTotal: combat.initialRed,
    redEntryOpen: true,
    redEntryRate: 0,
    breached: false,
    squads: [],
  };
}

function marchReinforcements(lane, dt, emit) {
  const { combat } = lane;
  // Keep pending squads in launch order, including when several arrive together.
  let pending = 0;
  for (const squad of lane.squads) {
    if (marchSquad(squad, lane.front, combat, lane.marchSpeed, dt)) {
      lane.blueTotal += squad.count;
      emit?.(lane.id, "arrival", { ...squad, side: "blue", front: lane.front });
    } else {
      lane.squads[pending++] = squad;
    }
  }
  lane.squads.length = pending;
}

function updateLane(lane, time, dt, emit, march) {
  const { combat, objective } = lane;
  const previousFront = lane.front;
  const supplyWasOpen = lane.redEntryOpen;

  march(lane, dt, emit);

  const { redArrived, redLost, blueLost } = advanceLaneCombat(lane, combat, objective, time, dt);
  if (emit) {
    if (redArrived > 0) {
      emit(lane.id, "arrival", { side: "red", count: redArrived, front: previousFront });
    }
    if (redLost > 0 || blueLost > 0) {
      const losses = { redLost, blueLost, front: previousFront };
      emit(lane.id, "casualties", losses);
      if (redLost > 0 && blueLost > 0) emit(lane.id, "clash", losses);
    }
    if (lane.front !== previousFront) {
      emit(lane.id, "frontline", { previousFront, front: lane.front });
    }
    if (supplyWasOpen && !lane.redEntryOpen) {
      emit(lane.id, "supplyCutoff", { front: lane.front });
    }
  }
  if (lane.front >= objective.castleFront) {
    lane.breached = true;
    emit?.(lane.id, "breach", { front: lane.front });
  }
}

function advancePhalanx(formation, rules, time) {
  const elapsed = time - formation.since;
  let phase = formation.phase;
  if (phase === "unlocked" && elapsed > 0) phase = "marching";
  else if (phase === "marching" && elapsed >= rules.marchTime) phase = "deploying";
  else if (phase === "deploying" && elapsed >= rules.deployTime) phase = "pushing";
  if (phase === formation.phase) return;
  Object.assign(formation, { phase, since: time });
  return phase;
}

function battleOutcome({ left, right }) {
  if (left.breached || right.breached) return "defeat";
  if (!left.redEntryOpen && left.redTotal === 0 &&
      !right.redEntryOpen && right.redTotal === 0) return "victory";
  return null;
}

export function createDualFront(crossings, { onEvent, beforeTick, afterTick, phalanx, connectedRules = connectedSiegeRules } = {}) {
  const state = { time: 0, lanes: null, outcome: null };
  const connected = phalanx && createConnectedSiege(state, phalanx, connectedRules);
  const march = connected ? connected.march : marchReinforcements;
  let definition = crossings;
  let nextSquadId = 1;

  const clock = createBattleClock((dt) => {
    if (!state.lanes) return;
    if (state.outcome) {
      afterTick?.(dt);
      return;
    }
    state.time += dt;
    beforeTick?.(dt);
    const events = onEvent ? [] : null;
    const emit = events ? ((laneId, type, payload) => {
      events.push({ ...payload, type, laneId, time: state.time });
    }) : null;

    const { left, right } = state.lanes;
    connected?.advanceTransfers(right, dt, emit);
    const phaseAtStart = state.phalanx?.phase;
    if (phaseAtStart === "pushing" || phaseAtStart === "secured") {
      march(left, dt, emit);
      if (phaseAtStart === "pushing") {
        const previousFront = left.front;
        const distance = phalanx.holdFront - previousFront;
        left.front = previousFront + Math.sign(distance) * Math.min(Math.abs(distance), phalanx.pushSpeed * dt);
        if (left.front !== previousFront)
          emit?.("left", "frontline", { previousFront, front: left.front });
      }
      connected.hold(left, dt, emit);
      if (phaseAtStart === "pushing" && left.front === phalanx.holdFront) {
        Object.assign(state.phalanx, { phase: "secured", since: state.time });
        emit?.("left", "phalanxSecured", { phase: "secured", front: left.front });
        connected.secure(left, emit);
      }
    } else {
      updateLane(left, state.time, dt, emit, march);
      if (phalanx && !left.breached) {
        const phase = advancePhalanx(state.phalanx, phalanx, state.time);
        if (phase) {
          const type = "phalanx" + phase[0].toUpperCase() + phase.slice(1);
          emit?.("left", type, { phase, front: left.front });
        }
      }
    }
    updateLane(right, state.time, dt, emit, march);
    if (!phalanx) {
      state.outcome = battleOutcome(state.lanes);
    } else if (left.breached || right.breached) {
      state.outcome = "defeat";
    } else {
      connected.advanceOffensive(left, right, dt, emit);
    }
    if (events) for (const event of events) onEvent(event);
    afterTick?.(dt);
  });

  function clear() {
    clock.reset();
    state.time = 0;
    state.lanes = null;
    state.outcome = null;
    nextSquadId = 1;
    if (connected) {
      state.siege = null;
      state.phalanx = null;
      state.retreat = null;
    }
  }

  function reset(nextCrossings = definition) {
    const left = createLane("left", nextCrossings.left);
    const right = createLane("right", nextCrossings.right);
    clear();
    definition = nextCrossings;
    state.lanes = { left, right };
    if (phalanx) state.phalanx = { phase: "locked", since: 0 };
    connected?.reset();
  }

  function launchVolley(laneId, { multiplier, hits = 3, origin }) {
    if (!CROSSINGS.includes(laneId)) throw new RangeError("Unknown crossing");
    if (!Number.isSafeInteger(multiplier) || multiplier < 1 ||
        !Number.isInteger(hits) || hits < 1 || hits > 3 ||
        !Number.isSafeInteger(multiplier * hits)) {
      throw new RangeError("Expected a positive integer multiplier and one to three hits");
    }
    if (!state.lanes || state.outcome) return;

    const lane = state.lanes[laneId];
    const squad = {
      id: nextSquadId++,
      laneId,
      count: hits * multiplier,
      multiplier,
      hits,
      ...(origin === undefined ? {} : { origin }),
    };
    if (connected) connected.routeVolley(squad);
    else Object.assign(squad, { y: lane.combat.spawnY, marchTime: 0 });
    state.lanes[squad.laneId].squads.push(squad);
    onEvent?.({ ...squad, type: "launch", side: "blue", time: state.time });
  }

  function unlockPhalanx() {
    if (state.phalanx?.phase !== "locked" || state.outcome) return;
    Object.assign(state.phalanx, { phase: "unlocked", since: state.time });
    onEvent?.({ type: "phalanxUnlocked", laneId: "left",
      time: state.time, phase: "unlocked", front: state.lanes.left.front });
  }

  reset();
  return { state, clock, advance: clock.advance, launchVolley, unlockPhalanx, reset, clear };
}
