import { createBattleClock, createGame } from "../src/game.js";
import { redSupplyRate } from "../src/lane-combat.js";
import { LEVEL_ONE } from "../src/levels.js";
import { createAim } from "../tests/helpers/strategies.js";

const round = number => +number.toFixed(2);
const selected = LEVEL_ONE.combat.redMobilization;
const cases = [
  ["previous PR", 3, undefined],
  ["early mobilization", 5, { ...selected, start: 18, frontRanks: 550, rate: 650 }],
  ["full reserve pressure", 5, { ...selected, frontRanks: 30000 }],
  ...[3, 5, 10].map(factor => ["staggered mobilization", factor, selected]),
];
const results = [];
for (const [scenario, factor, redMobilization] of cases) {
  const combat = { ...LEVEL_ONE.combat, redMobilization };
  const level = { ...LEVEL_ONE, combat,
    relayGates: LEVEL_ONE.relayGates.map(gate => ({ ...gate, mult: factor })),
  };
  for (const policy of ["A", "B", "C", "D", "99", "Rush"]) {
    let peakBlue = 0, peakRed = 0, furthest = 0, cutoff, unlocked, firstRelay, collision;
    let arrivals = 0, redArrivals = 0;
    const aim = createAim(policy);
    const game = createGame({ level, random: () => 0.5, onEffect(type, time, value) {
      if (type === "compound") firstRelay ??= round(time);
      if (type === "arrival") arrivals += value.count;
    } });
    game.reset();
    const { state } = game;
    const hz = Number(process.argv[2] ?? 60);
    const clock = createBattleClock(dt => {
      if (state.mode !== "playing") return;
      if (state.redEntryOpen) {
        const access = Math.max(0, Math.min(1,
          (state.front - level.objective.reinforcementCutoff) / combat.reinforcementApproach));
        redArrivals += access * redSupplyRate(state.t + dt, combat) * dt;
      }
      state.gunX = aim(state);
      game.update(dt);
      peakBlue = Math.max(peakBlue, state.blueTotal);
      peakRed = Math.max(peakRed, state.redTotal);
      furthest = Math.max(furthest, state.front);
      if (!state.redEntryOpen) cutoff ??= round(state.t);
      if (state.gates[2].open) unlocked ??= round(state.t);
      if (state.blueTotal >= 10000 && state.redTotal >= 10000)
        collision ??= { time: round(state.t), front: round(state.front),
          blue: Math.ceil(state.blueTotal), red: Math.ceil(state.redTotal) };
    });
    while (state.mode === "playing" && state.t < 240) clock.advance(1 / hz);
    results.push({ scenario, factor, policy, outcome: state.mode, time: round(state.t),
      peakBlue: Math.ceil(peakBlue), peakRed: Math.ceil(peakRed), furthest: round(furthest),
      blueLost: round(combat.initialBlue + arrivals - state.blueTotal),
      redLost: round(combat.initialRed + redArrivals - state.redTotal),
      cutoff, unlocked, firstRelay, collision });
  }
}
console.log(JSON.stringify(results, null, 2));
