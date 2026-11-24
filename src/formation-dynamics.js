import { clamp } from "./config.js";

const HZ = 30;
const MAX_LAG = 18;
const RESPONSE = [0.075, 0.11, 0.15];
const follow = (value, target, response) =>
  target + (value - target) * Math.exp(-1 / (HZ * response));

export function createFormationDynamics() {
  const ranks = new Float64Array(RESPONSE.length);
  const previous = new Float64Array(RESPONSE.length);
  const anchors = new Float64Array(RESPONSE.length);
  let origin, lastTime, lastFront, sampledFront, tick;
  let packed, oldPacked, pulse, oldPulse;
  const pose = { anchors, compression: 0, drive: 0, opening: 0 };

  function reset() {
    origin = null;
    packed = oldPacked = pulse = oldPulse = 0;
    pose.compression = pose.drive = pose.opening = 0;
    anchors.fill(0);
  }

  function step(time, front, level, engaged, arrivalAt, loss, occupied) {
    if (origin === null) {
      origin = lastTime = time;
      sampledFront = lastFront = front;
      anchors.fill(front);
      ranks.fill(front);
      previous.fill(front);
      tick = 0;
    }
    const elapsed = (time - origin) * HZ;
    const end = Math.floor(elapsed + 1e-8);
    while (tick < end) {
      const at = origin + ++tick / HZ;
      const fraction = clamp((at - lastTime) / (time - lastTime), 0, 1);
      const line = lastFront + (front - lastFront) * fraction;
      const velocity = (line - sampledFront) * HZ;
      sampledFront = line;
      const { blueAdvance, redAdvance } = level.combat;
      const drive = clamp(-velocity / (velocity < 0 ? blueAdvance : redAdvance), -1, 1);
      const advance = Math.max(0, drive);
      const retreat = Math.max(0, -drive);
      const hold = 1 - clamp(Math.abs(drive) * 2.8, 0, 1);
      const arrival = at >= arrivalAt ? Math.exp(-(at - arrivalAt) / 0.68) : 0;
      const target = engaged
        ? clamp(hold * (0.18 + arrival * 0.67) + retreat * (0.72 + loss * 0.28)
          - advance * 0.58, -0.32, 1)
        : 0;
      oldPacked = packed;
      packed = follow(packed, target, target > packed ? 0.24 : 0.41);
      oldPulse = pulse;
      pulse = follow(pulse, engaged ? drive : 0, 0.095);

      previous.set(ranks);
      for (let i = 0; i < ranks.length; i++) {
        const source = i ? previous[i - 1] : line;
        const response = RESPONSE[i] * (0.68 + occupied * 0.32);
        ranks[i] = line + clamp(follow(ranks[i], source, response) - line, -MAX_LAG, MAX_LAG);
      }
    }
    const blend = clamp(elapsed - end, 0, 1);
    pose.compression = oldPacked + (packed - oldPacked) * blend;
    pose.drive = oldPulse + (pulse - oldPulse) * blend;
    for (let i = 0; i < anchors.length; i++)
      anchors[i] = previous[i] + (ranks[i] - previous[i]) * blend;
    pose.opening = engaged ? pose.drive : 0;
    lastFront = front;
    lastTime = time;
  }

  reset();
  return { pose, reset, step };
}

// Depth zero is the authoritative contact rank. Interpolate across the same
// anchors for field slots and cached reserve rows.
export function formationLag(pose, front, depth) {
  if (!pose) return 0;
  const band = clamp(depth * 3, 0, 3);
  const index = Math.floor(band);
  const left = index ? pose.anchors[index - 1] - front : 0;
  const right = index < 3 ? pose.anchors[index] - front : left;
  return clamp(left + (right - left) * (band - index), -MAX_LAG, MAX_LAG);
}

// An opening grows in one section, shifts slightly, then closes before
// the next opens. Both teams bend in the same direction around the gap.
export function breakthroughOffset(time, x, row, momentum, red) {
  if (!momentum || row >= 6) return 0;
  const cycle = time / 1.46;
  const index = Math.floor(cycle);
  const age = cycle - index;
  const center = 210 + ((index * 37) % 77 - 38) + (age - 0.5) * 15;
  const profile = Math.max(0, 1 - ((x - center) / 42) ** 2);
  const envelope = (Math.sin(Math.PI * age)) ** 2;
  const losing = red ? momentum > 0 : momentum < 0;
  const depth = (1 - row / 6) ** 2;
  return -momentum * envelope * profile * depth * (losing ? 15 : 7);
}

// A representative casualty opens a lane for one exchange. The shared seam
// bends for both teams, so winning a lane never moves the logical front.
export const EXCHANGE_DURATION = 0.46;

export function exchangeOffset(exchange, time, x, row, red) {
  const age = (time - exchange.at) / EXCHANGE_DURATION;
  if (age < 0 || age >= 1 || row >= 4) return 0;
  const lane = Math.max(0, 1 - Math.abs(x - exchange.x) / 18);
  if (!lane) return 0;
  const depth = (1 - row / 4) ** 2;
  const lost = red === exchange.red;
  const move = lost
    ? Math.sin(Math.PI * clamp((age - 0.18) / 0.82, 0, 1)) * 14
    : Math.sin(Math.PI * age) * (4 + 4 * clamp((age - 0.12) / 0.25, 0, 1));
  return (exchange.red ? -1 : 1) * move * lane * depth;
}

export function exchangeSeam(exchange, time, x) {
  return exchangeOffset(exchange, time, x, 0, !exchange.red) * 0.72;
}


// Losses in one file draw successive ranks forward with a short delay.
export function rankReplenishment(age, row, distance, strength = 1) {
  if (row < 1 || row > 12 || distance >= 28) return 0;
  const phase = (age - row * 0.024) / 0.34;
  if (phase <= 0 || phase >= 1) return 0;
  return Math.sin(Math.PI * phase) * (1 - distance / 28) * (8 - row * 0.52) * strength;
}
