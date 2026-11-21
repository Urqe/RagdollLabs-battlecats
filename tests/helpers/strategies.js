import { createGame } from "../../src/game.js";

// Policies observe state and aim only. Both balanced policies use timed bursts
// long enough to reproduce with the game's existing sideways control.
const balancedSchedules = {
  C: {
    initial: 6,
    earlyCycle: 4,
    earlyDefense: 0.9,
    reserve: 5,
    cycle: 5.1,
    defense: 1.85,
  },
  D: {
    initial: 7,
    earlyCycle: 3.4,
    earlyDefense: 1,
    reserve: 4,
    cycle: 4,
    defense: 1.25,
  },
};

export function createAim(strategy) {
  const schedule = balancedSchedules[strategy === "99" ? "C" : strategy];
  let gate99At = null;
  return (s) => {
    if (strategy === "A") return 210;
    if (strategy === "Rush" || s.gates[2].open) return 329;
    if (s.gates[1].open) gate99At ??= s.t;
    if (strategy === "B") {
      return gate99At === null || s.t - gate99At < 4 ? 90 : 329;
    }
    if (gate99At === null) {
      const elapsed = s.t - schedule.initial;
      return elapsed < 0 ||
        elapsed % schedule.earlyCycle < schedule.earlyDefense
        ? 210
        : 90;
    }
    const elapsed = s.t - gate99At - schedule.reserve;
    return strategy === "99" ||
      elapsed < 0 ||
      elapsed % schedule.cycle < schedule.defense
      ? 90
      : 329;
  };
}

export function simulate(
  strategy,
  { dt = 1 / 60, delay = 0, aimOffset = 0 } = {},
) {
  const aim = createAim(strategy);
  let won = null;
  const game = createGame({
    onEnd: (value) => (won = value),
    random: () => 0.5,
  });
  game.reset();
  const s = game.state;
  let furthest = s.front;
  let cutoff = null;
  let activation = null;
  let atActivation = null;
  let direction = 0;
  let lastSampleTime = 0;
  const unlocked = new Set();
  const milestones = [];
  const samples = [sample(s)];
  const reversals = [];
  while (s.mode === "playing" && s.t < 240) {
    s.gunX = (s.t < delay ? 210 : aim(s)) + aimOffset;
    game.update(dt);
    for (let i = 1; i < s.gates.length; i++) {
      const gate = s.gates[i];
      if (gate.open && !unlocked.has(gate.mult)) {
        unlocked.add(gate.mult);
        milestones.push({ gate: gate.mult, ...sample(s) });
      }
    }
    furthest = Math.max(furthest, s.front);
    if (!s.redEntryOpen) cutoff ??= round(s.t);
    if (s.finalActivated && activation === null) {
      activation = s.t;
      atActivation = s.front;
    }
    if (s.t - lastSampleTime >= 1 - dt / 2) {
      const previous = samples.at(-1);
      const current = sample(s);
      lastSampleTime = s.t;
      samples.push(current);
      const movement = current.front - previous.front;
      const nextDirection = Math.sign(movement);
      if (Math.abs(movement) > 2 && nextDirection !== direction) {
        if (direction !== 0) {
          reversals.push({
            ...current,
            toward: nextDirection > 0 ? "castle" : "entry",
          });
        }
        direction = nextDirection;
      }
    }
  }
  return {
    strategy,
    won: s.mode === "victory" ? true : won,
    cutoff,
    seconds: round(s.t),
    furthest: round(furthest),
    activation: activation === null ? null : round(activation),
    pushback: activation === null ? 0 : round(atActivation - s.front),
    milestones,
    reversals,
    red: Math.ceil(s.redTotal),
    blue: Math.floor(s.blueTotal),
    samples,
    state: s,
  };
}

function round(n) {
  return Number(n.toFixed(2));
}

function sample(s) {
  return {
    time: round(s.t),
    front: round(s.front),
    red: Math.ceil(s.redTotal),
    blue: Math.floor(s.blueTotal),
  };
}
