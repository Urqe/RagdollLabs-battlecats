import {
  PURRAPULT_STRATEGIES,
  simulatePurrapult,
} from "../tests/helpers/purrapult.js";

const results = PURRAPULT_STRATEGIES.flatMap((strategy) =>
  [30, 60, 120].map((hz) => simulatePurrapult(strategy, hz)),
);
console.log(JSON.stringify(results, null, 2));
