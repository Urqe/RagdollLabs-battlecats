import assert from "node:assert/strict";
import test from "node:test";
import { crowdColumn, crowdRank, crowdReach, crowdSeam } from "../src/crowd-field.js";
import { armyScale, RESERVE_LIMIT } from "../src/army-visual.js";

test("occupation deepens with population and contracts with pressure and terrain", () => {
  const small = crowdReach(250, 300);
  const medium = crowdReach(250, 3000);
  const large = crowdReach(250, 30000);
  assert.ok(small < medium && medium < large && large <= 250);
  assert.ok(crowdReach(160, 30000) < large);
  assert.ok(crowdReach(250, 30000, 0.8) < large);
  assert.equal(crowdReach(-5, 30000), 0);
  for (let row = 0; row < 25; row++) {
    const distance = crowdRank(large, row, 25, 0.5);
    assert.ok(distance > 0 && distance < large);
    if (row) assert.ok(distance > crowdRank(large, row - 1, 25, 0.5));
  }
  assert.ok(armyScale(30000).reserve > armyScale(3000).reserve * 4);
  assert.equal(armyScale(300000).reserve, RESERVE_LIMIT);
});

test("local deformation follows the authoritative line and vanishes at terrain edges", () => {
  for (let frame = 0; frame < 120; frame++) {
    const line = 335 - frame / 2;
    for (const x of [-1, -0.45, 0, 0.45, 1]) {
      const y = crowdSeam(line, x, 0.8, 1);
      assert.ok(Math.abs(y - line) <= 4.6);
      if (Math.abs(x) === 1) assert.equal(y, line);
      assert.ok(Math.abs(crowdSeam(line + 18, x, 0.8, 1) - y - 18) < 1e-9);
      assert.equal(crowdSeam(line, x, 0.8, 0), line);
    }
  }
  assert.notEqual(crowdColumn(4, 5, 18), crowdColumn(4, 6, 18));
});
