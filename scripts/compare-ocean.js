import { createBattleClock, createGame } from "../src/game.js";
import { LEVEL_ONE } from "../src/levels.js";
import { createAim } from "../tests/helpers/strategies.js";

const round = number => +number.toFixed(2);
const results = [];
for (const factor of [1, 2, 3, 8]) {
  const level = { ...LEVEL_ONE,
    relayGates: factor === 1 ? [] : LEVEL_ONE.relayGates.map(gate => ({ ...gate, mult: factor })),
  };
  for (const policy of ["A", "B", "C", "D", "99", "Rush"]) {
    let peakBlue = 0, peakRed = 0, furthest = 0, cutoff, unlocked, firstRelay, waveSize;
    const aim = createAim(policy);
    const game = createGame({ level, random: () => 0.5, onEffect(type, time, value) {
      if (type === "compound") {
        firstRelay ??= round(time);
        waveSize = value.count * 3;
      }
    } });
    game.reset();
    const { state } = game;
    const hz = Number(process.argv[2] ?? 60);
    const clock = createBattleClock(dt => {
      if (state.mode !== "playing") return;
      state.gunX = aim(state);
      game.update(dt);
      peakBlue = Math.max(peakBlue, state.blueTotal);
      peakRed = Math.max(peakRed, state.redTotal);
      furthest = Math.max(furthest, state.front);
      if (!state.redEntryOpen) cutoff ??= round(state.t);
      if (state.gates[2].open) unlocked ??= round(state.t);
    });
    while (state.mode === "playing" && state.t < 240) clock.advance(1 / hz);
    results.push({ factor, policy, outcome: state.mode, time: round(state.t),
      peakBlue: Math.ceil(peakBlue), peakRed: Math.ceil(peakRed), furthest: round(furthest),
      cutoff, unlocked, firstRelay, waveSize });
  }
}
console.log(JSON.stringify(results, null, 2));
