import { LEVEL_FIVE } from "../src/levels.js";
import { simulatePawtorians, strategies } from "../tests/helpers/pawtorians.js";

const level = LEVEL_FIVE;
const compare = (candidate, alternate) => strategies.map(strategy => {
  const { outcome, seconds, peak } = simulatePawtorians(strategy, 60, candidate, alternate);
  return { strategy, outcome, seconds: +seconds.toFixed(2), peak: +peak.toFixed(1) };
});

if (process.argv.includes("--sweep")) {
  for (const population of [1350, 1500, 1650]) {
    for (const maxRedReinforcements of [375, 395, 415]) {
      const candidate = {
        ...level,
        pawtorians: { ...level.pawtorians, population },
        combat: { ...level.combat, maxRedReinforcements },
      };
      console.log(JSON.stringify({ population, maxRedReinforcements, outcomes: [false, true].map(alternate => compare(candidate, alternate)) }));
    }
  }
  for (const multiplier of [1, 3, 5, 7]) {
    const candidate = { ...level, relayGates: [{ ...level.relayGates[0], mult: multiplier }] };
    console.log(JSON.stringify({ multiplier, outcomes: compare(candidate, true) }));
  }
} else if (process.argv.includes("--summary")) {
  console.table(compare(level, false));
  console.table(compare(level, true));
} else {
  console.log(JSON.stringify([30, 60, 120].map(hz => ({
    hz, results: strategies.map(strategy => simulatePawtorians(strategy, hz)),
  })), null, 2));
}
