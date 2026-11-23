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

function updateLane(lane, time, dt, emit) {
  const { combat, objective } = lane;
  const previousFront = lane.front;
  const supplyWasOpen = lane.redEntryOpen;

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

function battleOutcome({ left, right }) {
  if (left.breached || right.breached) return "defeat";
  if (!left.redEntryOpen && left.redTotal === 0 &&
      !right.redEntryOpen && right.redTotal === 0) return "victory";
  return null;
}

export function createDualFront(crossings, { onEvent, beforeTick, afterTick } = {}) {
  const state = { time: 0, lanes: null, outcome: null };
  let definition = crossings;
  let nextSquadId = 1;

  const clock = createBattleClock((dt) => {
    if (!state.lanes || state.outcome) return;
    state.time += dt;
    beforeTick?.(dt);
    const events = onEvent ? [] : null;
    const emit = events ? ((laneId, type, payload) => {
      events.push({ ...payload, type, laneId, time: state.time });
    }) : null;

    for (const id of CROSSINGS) updateLane(state.lanes[id], state.time, dt, emit);
    state.outcome = battleOutcome(state.lanes);
    if (events) for (const event of events) onEvent(event);
    afterTick?.();
  });

  function clear() {
    clock.reset();
    state.time = 0;
    state.lanes = null;
    state.outcome = null;
    nextSquadId = 1;
  }

  function reset(nextCrossings = definition) {
    const left = createLane("left", nextCrossings.left);
    const right = createLane("right", nextCrossings.right);
    clear();
    definition = nextCrossings;
    state.lanes = { left, right };
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
      y: lane.combat.spawnY,
      marchTime: 0,
      ...(origin === undefined ? {} : { origin }),
    };
    lane.squads.push(squad);
    onEvent?.({ ...squad, type: "launch", side: "blue", time: state.time });
  }

  reset();
  return { state, clock, advance: clock.advance, launchVolley, reset, clear };
}
