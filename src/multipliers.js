import { clamp } from "./config.js";

export function createMultipliers(state, sprinkle, random = Math.random) {
  function spawnSquad(g, fromX, entryY = g.hitY, slot = 0, volley = null) {
    state.squads.push({
      x: clamp(
        fromX,
        state.level.battlefield.minX + 1,
        state.level.battlefield.maxX - 1,
      ),
      y: state.level.combat.spawnY,
      entryY,
      slot,
      volley,
      target: "blue",
      gates: [{ id: g.id, multiplier: g.mult }],
      count: g.mult,
      mult: g.mult,
      phase: random() * 6,
      marchTime: 0,
    });
    sprinkle(
      fromX,
      entryY - 5,
      g.color,
      1 + g.style * 2,
    );
  }
  return { spawnSquad };
}

// Sweep the march segment. The receiving line wins ties, so a cohort meeting
// the army before reaching a relay arrives with its current population.
export function crossRelayGates(state, cohort, previousY, receiveY, onEffect) {
  const relays = state.level.relayGates;
  if (!relays?.length || !cohort.gates?.length) return;
  let crossedY = previousY;
  for (let pass = 0; pass < relays.length; pass++) {
    const last = cohort.gates.at(-1).id;
    const relay = relays.reduce((next, gate) => gate.after === last &&
      (!next || gate.hitY > next.hitY) &&
      crossedY > gate.hitY && cohort.y <= gate.hitY && receiveY < gate.hitY &&
      Math.abs(cohort.x - gate.x) <= gate.width / 2 &&
      (!gate.requires || state.gates.some(entry => entry.id === gate.requires && entry.open)) &&
      !cohort.gates.some(entry => entry.id === gate.id) ? gate : next, null);
    if (!relay) break;
    const count = cohort.count * relay.mult;
    if (!Number.isSafeInteger(count) || count <= 0) throw new RangeError("Unsafe compound cohort size");
    cohort.count = count;
    cohort.gates.push({ id: relay.id, multiplier: relay.mult });
    cohort.relay = { y: relay.hitY, at: cohort.marchTime - (relay.hitY - cohort.y) / state.level.battlefield.marchSpeed };
    state.relayFlashes[relay.id] = state.t;
    crossedY = relay.hitY;
    onEffect?.("compound", state.t, { id: relay.id, volley: cohort.volley, count, multiplier: relay.mult });
  }
}
