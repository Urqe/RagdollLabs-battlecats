import { LEVEL_TWO } from "../src/levels.js";
import {
  PURRAPULT_STRATEGIES,
  simulatePurrapult,
} from "../tests/helpers/purrapult.js";

const retune = (combat, hits) => ({
  ...LEVEL_TWO,
  combat: { ...LEVEL_TWO.combat, ...combat },
  barricades: LEVEL_TWO.barricades.map((barricade) =>
    barricade.id === LEVEL_TWO.gates[2].barricadeId
      ? { ...barricade, hits }
      : barricade),
});
const baseline = retune({
  maxRedReinforcements: 288,
  redReinforcementGrowth: 3.42,
  redReinforcementEscalation: undefined,
  redLossPerDefender: undefined,
}, 231);

const run = (level, rates) => ["C", "D"].flatMap((schedule) =>
  rates.flatMap((hz) => PURRAPULT_STRATEGIES.map((strategy) =>
    simulatePurrapult(strategy, hz, level, schedule))));

if (process.argv.includes("--sweep")) {
  const candidates = [
    { growth: 3.42, cap: 315, hits: 231 },
    { growth: 4, cap: 350, hits: 231 },
    { growth: 4.5, cap: 350, hits: 231 },
    { growth: 5.5, cap: 350, hits: 231 },
    { growth: 5.5, cap: 325, hits: 135 },
    ...[9, 12, 15].flatMap((extra) => [305, 315, 325].map((cap) =>
      ({ growth: 3.42, cap, start: 20, extra, guard: 0.12, hits: 105 }))),
    { growth: 3.42, cap: 315, start: 20, extra: 12, hits: 105 },
    { growth: 3.42, cap: 315, start: 20, extra: 12, guard: 0.12, hits: 231 },
  ];
  const sweep = candidates.map((parameters) => {
    const { growth, cap, start, extra, guard, hits } = parameters;
    const level = retune({
      redReinforcementGrowth: growth,
      maxRedReinforcements: cap,
      redReinforcementEscalation: start === undefined ? undefined : { start, growth: extra },
      redLossPerDefender: guard,
    }, hits);
    const outcomes = run(level, [60]).map(({ variant, strategy, outcome, seconds }) =>
      ({ variant, strategy, outcome, seconds }));
    return { parameters, outcomes };
  });
  console.log(JSON.stringify(sweep, null, 2));
} else {
  const rates = [30, 60, 120];
  const after = run(LEVEL_TWO, rates);
  const results = process.argv.includes("--compare")
    ? { before: run(baseline, rates), after }
    : after;
  console.log(JSON.stringify(results, null, 2));
}
