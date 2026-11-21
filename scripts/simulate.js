import { simulate } from "../tests/helpers/strategies.js";
const results = [];
for (const strategy of ["A", "B", "C"])
  for (const hz of [30, 60, 120]) {
    const { state, ...result } = simulate(strategy, { dt: 1 / hz });
    results.push({ hz, ...result });
  }
console.log(JSON.stringify(results, null, 2));
