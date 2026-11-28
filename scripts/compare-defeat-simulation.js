import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(resolve(process.argv[2] ?? ".") + "/");
const load = path => import(new URL(path, root));
const [{ createGame, createBattleClock }, levels, level1, level2, level3, level4, level5, dual] = await Promise.all([
  load("src/game.js"), load("src/levels.js"), load("tests/helpers/strategies.js"),
  load("tests/helpers/purrapult.js"), load("tests/helpers/meowmen.js"),
  load("tests/helpers/dual-strategies.js"), load("tests/helpers/pawtorians.js"),
  load("scripts/simulate-dual.js"),
]);

const plans = [
  [levels.LEVEL_ONE, ["A", "B", "C", "D", "99", "Rush"], strategy => level1.createAim(strategy)],
  [levels.LEVEL_TWO, level2.PURRAPULT_STRATEGIES, strategy => level2.purrapultAim(strategy)],
  [levels.LEVEL_THREE, ["starter", "gates", "archer-first", "balanced", "support-only"],
    strategy => level3.meowmenAim(strategy)],
  [levels.LEVEL_FIVE, [...level5.strategies, "late-recovery"], strategy => state => {
    if (strategy !== "late-recovery") return level5.pawtorianAim(strategy, state);
    if (state.gates[1].open && state.t < 32) return state.gates[1].x;
    return level5.pawtorianAim("gates", state);
  }],
];

function run(level, aim, hz) {
  const digest = createHash("sha256");
  const game = createGame({ level, random: () => 0.5,
    onEffect: (...event) => digest.update(JSON.stringify(event) + "\n"),
  });
  game.reset(level);
  const clock = createBattleClock(dt => {
    if (game.state.mode !== "playing") return;
    game.state.gunX = aim(game.state);
    game.update(dt);
    const { burst, level: definition, ...battle } = game.state;
    digest.update(JSON.stringify(battle) + "\n");
  });
  while (game.state.mode === "playing" && game.state.t < 240) clock.advance(1 / hz);
  const { mode, t, front } = game.state;
  return { mode, t, front, digest: digest.digest("hex") };
}

function runSiege(strategy, hz) {
  const digest = createHash("sha256");
  const result = dual.simulateDual(strategy, hz, {
    onEvent(event, state) {
      if (event.type === "frontline") digest.update(JSON.stringify(state) + "\n");
    },
  });
  return { ...result, stateDigest: digest.digest("hex") };
}

console.log(JSON.stringify([30, 60, 120].map(hz => ({
  hz,
  battles: plans.flatMap(([level, strategies, createAim]) => strategies.map(strategy =>
    ({ level: level.number, strategy, ...run(level, createAim(strategy), hz) }))),
  siege: level4.dualStrategies.map(strategy => runSiege(strategy, hz)),
})), null, 2));
