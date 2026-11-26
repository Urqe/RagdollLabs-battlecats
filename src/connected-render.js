import { createAirborneCats } from "./airborne-cats.js";
import { FLAG_CAPTURE_TIME, FLAG_RAISE_TIME, mergeProgress, smoothStep, victoryAdvance } from "./army-movement.js";
import { armyScale, CROSSING_LITERAL_ARMY, encounterBalance, encounterOffset, fieldColumn, fieldRow, fieldSpacing } from "./army-visual.js";
import { siegeRoutes, westRearEntry } from "./connected-siege.js";
import { createFormationDynamics, formationLag, rankReplenishment } from "./formation-dynamics.js";
import { clamp, H, TAU, W } from "./config.js";
import { polygon } from "./terrain.js";

const westRally = [99, 397];
const junction = [209, 478];
const entry = [210, 511];
const ridgePass = [220, 83];
const westRear = [90, westRearEntry];
const eastCommand = [315, 121];
const eastBend = [284, 449];
const eastShoulder = [302, 393];
const mix = (a, b, p) => a + (b - a) * p;
const westX = y => 100 - 19 * Math.sin((y - 131) / 253 * Math.PI);
const eastX = y => 303 + 20 * Math.sin((y - 123) / 337 * Math.PI);
const center = (id, y) => id === "left" ? westX(y) : eastX(y);
const frontage = (id, y) => id === "left"
  ? 42 + 27 * smoothStep(Math.abs(y - 308) / 112)
  : 60 + 19 * smoothStep(Math.abs(y - 306) / 140);

function rect(ctx, fill, x, y, w, h) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function line(ctx, color, width, points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

function terrain(ctx) {
  rect(ctx, "#344743", 0, 0, W, H);
  polygon(ctx, "#596b50", [0, 46, 420, 42, 420, 515, 0, 515]);
  polygon(ctx, "#786b55", [18, 48, 400, 48, 406, 151, 363, 175, 50, 172, 14, 137]);
  const west = [[115, 119], [89, 202], [78, 305], westRally, [135, 436], junction, entry];
  const east = [[303, 111], [323, 225], [316, 343], [307, 405], [275, 450], junction, entry];
  line(ctx, "#46564a", 119, west);
  line(ctx, "#46564a", 157, east);
  line(ctx, "#a8946c", 100, west);
  line(ctx, "#ac9870", 138, east);
  line(ctx, "#b9a378", 80, [westRally, [142, 441], junction, [281, 449], [310, 403]]);
  polygon(ctx, "#ac9870", [19, 57, 401, 57, 409, 109, 389, 143, 335, 155,
    256, 143, 197, 133, 130, 150, 51, 151, 13, 116]);
  line(ctx, "#d0b587", 2, [[24, 58], [201, 60], [395, 56]]);
  // The exposed rock spine divides the approaches. The two routes join
  // on the apron below its tip and cross open ground above it.
  polygon(ctx, "#445048", [198, 148, 237, 182, 253, 255, 247, 327, 226, 404,
    198, 422, 159, 381, 149, 310, 159, 242, 168, 186]);
  polygon(ctx, "#5a6353", [198, 148, 218, 172, 221, 249, 206, 299,
    226, 394, 198, 403, 174, 359, 163, 293, 176, 228, 173, 195]);
  polygon(ctx, "#768075", [194, 170, 214, 201, 198, 231, 182, 221, 184, 188]);
  polygon(ctx, "#697464", [190, 269, 213, 281, 202, 323, 177, 333, 173, 299]);
  polygon(ctx, "#3e4c46", [224, 260, 245, 269, 235, 326, 212, 341, 219, 306]);
  for (let i = 0; i < 390; i++) {
    const x = (i * 117.31) % W;
    const y = 58 + (i * 71.83) % 447;
    rect(ctx, i % 3 ? "#362f2325" : "#e1d2a245", x, y, 2 + i % 5, 1 + i % 2);
  }
  // Timber decking and stone abutments mark the west hold.
  rect(ctx, "#574f41", 27, 278, 108, 52);
  for (let y = 281; y < 330; y += 7) rect(ctx, "#958060", 34, y, 94, 5);
  rect(ctx, "#5a645b", 25, 273, 8, 63);
  rect(ctx, "#5a645b", 129, 273, 8, 63);
  for (const x of [31, 141, 250, 361]) {
    polygon(ctx, "#412f32", [x - 24, 53, x - 8, 25, x + 17, 25, x + 26, 54]);
    polygon(ctx, "#a35d4c", [x - 20, 51, x - 8, 25, x + 5, 50]);
    rect(ctx, "#d48b66", x - 9, 26, 26, 2);
  }
  rect(ctx, "#495c65", 9, 518, 402, 242);
  rect(ctx, "#72847d", 22, 526, 376, 165);
  for (let row = 0; row < 9; row++) {
    for (let x = 24 + (row % 2) * 12; x < 390; x += 26)
      rect(ctx, "#81918a", x, 530 + row * 17, 22, 13);
  }
  for (const [x, w] of [[10, 36], [374, 36]]) {
    rect(ctx, "#344c5c", x, 478, w, 63);
    rect(ctx, "#81948f", x - 3, 478, w + 6, 10);
    rect(ctx, "#4197c7", x + 11, 501, 14, 23);
  }
  rect(ctx, "#263b49", 9, 704, 402, 56);
  for (let x = 14; x < 405; x += 23) rect(ctx, "#647e86", x, 702, 15, 9);
}

export function routePoint(cohort, offset, anchors, point) {
  const legs = siegeRoutes[cohort.route];
  let leg = cohort.leg;
  let distance = cohort.distance - offset;
  if (distance < 0 && leg === 0 && cohort.route === "encirclement") {
    point.y = eastCommand[1] + Math.min(62, -distance * 6);
    point.x = eastX(point.y);
    point.sideX = 1;
    point.sideY = 0;
    return point;
  }
  while (distance < 0 && leg > 0) distance += legs[--leg][2];
  const [from, to, length] = legs[leg];
  let a = anchors[from], b = anchors[to];
  if (cohort.route === "withdrawal" && anchors.withdrawalRally) {
    if (from === "westRally") a = anchors.withdrawalRally;
    if (to === "westRally") b = anchors.withdrawalRally;
  }
  const westEntry = from === "rearJunction" && cohort.route === "westEntry" && anchors.westReceiver;
  if (westEntry) b = cohort.dock ?? anchors.westReceiver;
  if (from === "rearJunction" && to === "eastContact" && cohort.dock) b = cohort.dock;
  let progress = clamp(distance / length, 0, 1);
  if (westEntry && b[1] < anchors.westBend[1]) {
    const bend = anchors.westBend;
    const first = Math.hypot(bend[0] - a[0], bend[1] - a[1]);
    const second = Math.hypot(b[0] - bend[0], b[1] - bend[1]);
    const travel = progress * (first + second);
    if (travel < first) {
      b = bend;
      progress = travel / first;
    } else {
      a = bend;
      progress = (travel - first) / second;
    }
  }
  if (from === "rearJunction" && to === "eastContact") {
    const bend = b[1] < eastShoulder[1] ? eastShoulder : b;
    const first = Math.hypot(eastBend[0] - a[0], eastBend[1] - a[1]);
    const second = Math.hypot(bend[0] - eastBend[0], bend[1] - eastBend[1]);
    const third = Math.hypot(b[0] - bend[0], b[1] - bend[1]);
    const travel = progress * (first + second + third);
    if (travel < first) {
      b = eastBend;
      progress = travel / first;
    } else if (travel < first + second || !third) {
      a = eastBend;
      b = bend;
      progress = (travel - first) / second;
    } else {
      a = bend;
      progress = (travel - first - second) / third;
    }
  }
  point.x = mix(a[0], b[0], progress);
  point.y = mix(a[1], b[1], progress);
  const span = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  point.sideX = (b[1] - a[1]) / span;
  point.sideY = (a[0] - b[0]) / span;
  return point;
}

const effectPool = () => ({
  dynamics: createFormationDynamics(), flights: createAirborneCats(8), pulse: -10, casualtyAt: -10, serial: 0,
  x: 0, y: 0, intensity: 0, redLost: 0, blueLost: 0, replenishment: [-Infinity, -Infinity], replenishmentX: [0, 0],
});

export function createConnectedPresentation(ctx, figures, state, battle) {
  let west, east, rear, shieldAt, thrustAt, shieldPower, lockAt, withdrawalFront;
  let routed, joinedAt, joinedCount, breakthroughAt;
  const westContact = [0, 0], eastContact = [0, 0], launchPoint = [0, 0];
  const westReceiver = [...westRally];
  const westBend = [135, 436];
  const arrivals = [];
  let receiverAt;
  const withdrawalRally = [...westRally];
  const anchors = { castleEntry: launchPoint, rearJunction: junction, westRally, westRear,
    eastCommand, ridgePass, westContact, eastContact, withdrawalRally, westReceiver, westBend };
  const point = {};
  const scale = {};
  const metrics = { figures: 0, stamps: 0, reserveSilhouettes: 0, represented: 0, flights: 0,
    cohorts: 0, transferCohorts: 0, flankCohorts: 0, joins: 0, drawMs: 0 };
  const renderState = { leftBlue: 0, rightBlue: 0, leftRed: 0, rightRed: 0,
    phase: "locked", transfers: 0, flank: false };

  function reset() {
    west = effectPool();
    east = effectPool();
    rear = effectPool();
    shieldAt = thrustAt = lockAt = joinedAt = breakthroughAt = -10;
    shieldPower = joinedCount = 0;
    withdrawalFront = 308;
    routed = null;
    arrivals.length = 0;
    receiverAt = null;
    westReceiver.splice(0, 2, ...westRally);
    eastContact.splice(0, 2, 310, 450);
    for (const key of Object.keys(metrics)) metrics[key] = 0;
  }
  reset();

  function fly(local, event, red, defeated, index, power, rearHit = false) {
    const direction = (red ? -1 : 1) * (rearHit ? -1 : 1);
    const spread = Math.sin(++local.serial * 2.39) * (rearHit ? 46 : 39);
    return local.flights.launch({
      at: event.time, x: local.x + spread, y: local.y + direction * 4,
      vx: spread * (0.8 + power * 0.72), vy: direction * (32 + power * 30),
      lift: 54 + power * 49 + index * 3, spin: (spread < 0 ? -1 : 1) * (6 + power * 5),
      red, defeated, slot: !defeated && !rearHit ? (local.serial + index * 3) % 11 : undefined,
      bounce: defeated ? 0.2 : 0.38, intensity: power, priority: power > 1.4,
    });
  }

  function receive(event, sim) {
    const { type, laneId, time } = event;
    const rearHit = event.waypoint === "westRear";
    const local = rearHit ? rear : laneId === "left" ? west : east;
    if (type === "infantryWithdrawal" && event.front !== undefined) withdrawalFront = event.front;
    if (type === "phalanxPushing") lockAt = time;
    if (type === "phalanxSecured") {
      for (let i = arrivals.length - 1; i >= 0; i--) {
        if (arrivals[i].laneId === "left") arrivals.splice(i, 1);
      }
    }
    if (type === "mainBreakthrough") breakthroughAt = time;
    if (type === "transferArrival" || (type === "arrival" && event.side === "blue")) {
      const receiver = laneId === "left" ? westReceiver : eastContact;
      if (arrivals.length === 12) arrivals.shift();
      arrivals.push({ ...event, distance: siegeRoutes[event.route][event.leg][2],
        joinedAt: time, dock: [...receiver] });
      if (laneId === "right") {
        joinedAt = time;
        joinedCount = event.count;
      }
    }
    if (type === "victory" || sim.outcome === "defeat") arrivals.length = 0;
    if (type === "enemyRouted") routed = { count: event.count, time };
    if (type !== "clash" && type !== "shieldImpact" && type !== "spearThrust" && type !== "casualties") return;
    local.y = event.front;
    local.x = center(laneId, local.y);
    local.flights.step(time);
    if (type === "shieldImpact") {
      shieldAt = local.pulse = time;
      shieldPower = local.intensity = event.intensity;
      const limit = Math.min(event.repelled, event.surge ? 5 : 2);
      for (let i = 0; i < limit; i++) fly(local, event, true, false, i, event.intensity);
    } else if (type === "spearThrust") {
      thrustAt = time;
    } else if (type === "clash" && time - local.pulse >= 0.14) {
      local.pulse = time;
      local.intensity = 0.85;
      fly(local, event, local.serial % 2 === 0, false, 0, 0.65);
    } else if (type === "casualties") {
      local.redLost += event.redLost;
      local.blueLost += event.blueLost;
      if (time - local.casualtyAt < 0.24) return;
      local.casualtyAt = time;
      if (rearHit) {
        local.pulse = time;
        local.intensity = 1.6;
        if (sim.lanes.left.redTotal > 1) fly(local, event, true, false, 0, 1.5, true);
      }
      for (const red of [true, false]) {
        const key = red ? "redLost" : "blueLost";
        if (local[key] >= 1 && fly(local, event, red, true, 0, rearHit ? 1.6 : 1.02, rearHit)) {
          local[key] %= 1;
          if (time - local.replenishment[Number(red)] > 0.55) {
            local.replenishment[Number(red)] = time;
            local.replenishmentX[Number(red)] = local.x + Math.sin(local.serial * 2.39) * 16;
          }
        }
      }
    }
  }

  function soldier(x, y, red, size, phase) {
    figures.soldier(x, y, red, size, phase);
    metrics.figures++;
    metrics.represented++;
  }

  function stamp(x, y, count, red, pose, size) {
    figures.reserveStamp(x, y, count, red, pose, size);
    metrics.stamps++;
    metrics.reserveSilhouettes += count;
    metrics.represented += count;
  }

  function updateReceiver(id, front, depth, rear, time) {
    const target = Math.min(516, Math.max(front + 9,
      Math.min(id === "left" ? 482 : 473, front + Math.min(depth, rear + 8))));
    const receiver = id === "left" ? westReceiver : eastContact;
    const travel = receiverAt === null ? Infinity : (time - receiverAt) * 95;
    receiver[1] += clamp(target - receiver[1], -travel, travel);
    receiver[0] = center(id, receiver[1]);
  }

  function formation(population, opposing, red, id, front, depth, local, time, pace,
    invert = false, intake = 0, fieldLimit = 144, reserveLimit = 588,
    balance = encounterBalance(population, opposing)) {
    if (population <= 0) {
      if (!red && !invert) updateReceiver(id, front, depth, 12, time);
      return;
    }
    const { field, reserve } = armyScale(population, scale,
      Math.min(CROSSING_LITERAL_ARMY, fieldLimit), fieldLimit);
    const side = (red ? -1 : 1) * (invert ? -1 : 1);
    const fieldCount = field;
    const rows = fieldRow(fieldCount - 1) + 1;
    const recoil = Math.max(0, 1 - (time - local.pulse) / 0.17) * local.intensity;
    const pose = local.dynamics.pose;
    const step = Math.min((depth * 0.64) / rows, (red ? 8.1 : 8.8) - Math.max(0, -balance) * 1.9) * (1 - pose.compression * 0.17);
    const rearDepth = rows * step + 14;
    const reservePitch = Math.max(0, Math.min(10, (depth - rearDepth) / 14));
    const budget = Math.min(reserveLimit, reserve);
    const staging = intake > 0 && depth > 128 ? Math.floor(budget * 0.28 / 6) : 0;
    const reserveCount = budget - staging * 6;
    const gap = local.replenishmentX[Number(red)];
    const sinceLoss = time - local.replenishment[Number(red)];
    for (let i = staging - 1; i >= 0; i--) {
      const row = Math.floor(i / 5);
      const shift = (time * 14 + row * 25 + i % 5 * 4) % Math.min(129, depth - 49);
      const y = 60 + shift;
      const fan = (i % 5 - 2) * (14 + y * 0.025);
      stamp(center(id, y) + fan, y, 6, true, Math.floor(time * 8) + i, 0.88);
    }
    for (let i = Math.ceil(reserveCount / 6) - 1; i >= 0; i--) {
      const row = Math.floor(i / 7), col = i % 7;
      const d = Math.min(depth, rearDepth + row * reservePitch);
      const offset = Math.sin(time * 7 + row * 0.9 + col * 0.4) * 1.8 + Math.sin(i * 4.1) * 3;
      const lag = formationLag(pose, front, 0.8 + row / 70);
      const y = front + side * clamp(d + offset + side * lag, 9, depth);
      const half = frontage(id, y);
      const file = (col % 2 ? 1 : -1) * Math.ceil(col / 2);
      const x = center(id, y) + file * half * 0.25 + (row % 2 ? 3 : -3);
      const refill = row < 3 ? rankReplenishment(sinceLoss, 10 + row, Math.abs(x - gap)) : 0;
      const shifted = y - side * Math.min(Math.abs(y - front) - 7, refill);
      stamp(x, shifted, Math.min(6, reserveCount - i * 6), red, Math.floor(time * 8) + i,
        clamp(half / 64, 0.54, 1.14));
    }
    for (let i = fieldCount - 1; i >= 0; i--) {
      const row = fieldRow(i), col = fieldColumn(i);
      const d = 8 + row * step;
      let y = front + side * d;
      const half = frontage(id, y);
      const offset = col * fieldSpacing(half - 5, row, fieldCount, 11.2)
        + Math.sin(i * 78.23) * 2.7 + (row % 2 ? 2.7 : -1.5);
      const x = center(id, y) + clamp(offset, -half + 5, half - 5);
      const pressure = (pace || 0) * (red ? 1 : -1) * 0.34;
      const push = opposing > 0 ? encounterOffset(time, i, row, red, balance, pressure,
        recoil * (1 - Math.min(1, Math.abs(local.x - x) / 43)) * 3) : 0;
      const stride = Math.sin(time * (opposing > 0 ? 14 : 9) + i * 1.1) * (row < 4 ? 2.1 : 1.12);
      const lag = formationLag(pose, front, Math.min(0.8, row / 22));
      const refill = Math.min(step * 0.58,
        rankReplenishment(sinceLoss, row, Math.abs(x - gap)));
      y = front + side * clamp(d - push - refill + stride + side * lag, 7, depth);
      const wall = frontage(id, y) - 5;
      const anchor = center(id, y);
      const drawX = clamp(x, anchor - wall, anchor + wall);
      const flight = local.flights.slots[Number(red)][i];
      if (flight && !invert) {
        flight.drawX = drawX;
        flight.drawY = y;
        flight.visible = true;
        metrics.represented++;
        continue;
      }
      soldier(drawX, y, red, row < 4 ? 5.65 : 4.8, i * 0.73);
    }
    if (!red && !invert) {
      const rear = reserveCount > 0
        ? rearDepth + Math.floor((Math.ceil(reserveCount / 6) - 1) / 7) * reservePitch
        : 8 + (rows - 1) * step;
      updateReceiver(id, front, depth, rear, time);
    }
  }

  function column(cohort, time) {
    const flank = cohort.route === "encirclement";
    const transfer = cohort.route === "withdrawal" || cohort.route === "westRally";
    const siege = cohort.multiplier === 100;
    const { field, reserve } = armyScale(cohort.count, scale);
    const grouped = flank || (transfer && cohort.count > 30) || siege;
    const batch = flank || siege ? 6 : grouped ? 4 : 1;
    const represented = grouped ? field + reserve * 0.37
      : Math.min(field, transfer ? 30 : 20);
    const groups = Math.min(flank ? 62 : transfer ? 31 : siege ? 13 : 20,
      Math.ceil(represented / batch));
    const width = flank ? 8 : transfer || siege || cohort.count > 5 ? 4 : 2;
    const rows = Math.ceil(groups / width);
    const path = siegeRoutes[cohort.route];
    const endDistance = path[cohort.leg][2];
    const close = !flank && cohort.leg === path.length - 1
      ? 0.72 + 0.28 * smoothStep((endDistance - cohort.distance) / 7) : 1;
    const blend = cohort.dock ? mergeProgress(time - cohort.joinedAt) : 0;
    if (cohort.dock) {
      ctx.globalAlpha = 1 - blend;
      metrics.joins++;
    }
    const age = time - cohort.departedAt;
    const opening = smoothStep(age / 0.27);
    const turns = cohort.route === "withdrawal";
    const release = smoothStep(age / 0.72);
    metrics.cohorts++;
    if (flank) metrics.flankCohorts++;
    if (transfer) metrics.transferCohorts++;
    for (let i = groups - 1; i >= 0; i--) {
      const row = Math.floor(i / width), col = i % width;
      const lead = (row - (flank || transfer ? 0 : rows * 0.18)) * (flank ? 1.8 : 0.95);
      const gathering = turns ? mix(-row * 0.72, lead, release) : flank ? lead : lead * opening;
      routePoint(cohort, gathering * close, anchors, point);
      const spread = (col - (Math.min(width, groups - row * width) - 1) / 2) *
        (flank ? 10.5 : turns ? mix(17, 10, release) : transfer ? 10 : siege ? 7.6 : 7) + Math.sin(i * 7) * 1.9;
      const lateral = (col % 2 ? 1 : -1) * (8 + (i % 5) * 3.2);
      const x = point.x + point.sideX * spread + Math.sin(time * 16 + i) * 1.3 + lateral * blend;
      const strideY = point.y + point.sideY * spread + Math.cos(time * 16 + i) * 1.3 - blend * 12;
      const y = flank && cohort.leg === 1 ? Math.min(westRearEntry - 7, strideY) : strideY;
      if (grouped) {
        stamp(x, y, Math.min(batch, Math.ceil(represented) - i * batch), false, Math.floor(time * 12) + i,
          flank ? 0.75 : siege ? 0.59 : 0.58);
      } else {
        soldier(x, y, false, 5.05, i + Number(cohort.id));
      }
    }
    if (cohort.dock) ctx.globalAlpha = 1;
  }

  function phalanx(sim, time) {
    const { phase, since } = sim.phalanx;
    if (phase === "locked") return;
    const rules = state.level.phalanx;
    const locked = phase === "pushing" || phase === "secured";
    const age = sim.time - since;
    const deploy = phase === "deploying" ? smoothStep(age / rules.deployTime) : Number(locked);
    const anchor = sim.lanes.left.front;
    const holdX = westX(anchor);
    const march = phase === "marching" ? clamp(age / rules.marchTime, 0, 1)
      : phase === "unlocked" ? 0 : 1;
    // Match the rear approach before stepping into the contact position.
    const x = march < 0.72 ? mix(187, westRally[0], march / 0.72) : mix(westRally[0], holdX, (march - 0.72) / 0.28);
    const rallyY = Math.max(westRally[1], anchor + 32);
    const y = march < 0.72 ? mix(465, rallyY, march / 0.72)
      : mix(rallyY, anchor + 27, (march - 0.72) / 0.28);
    const impact = Math.max(0, 1 - (time - shieldAt) / 0.22) * shieldPower;
    const thrust = Math.sin(Math.PI * clamp((time - thrustAt) / 0.22, 0, 1));
    const lock = Math.sin(Math.PI * clamp((time - lockAt) / 0.3, 0, 1));
    const salute = smoothStep(state.victoryElapsed / 0.57);
    for (let rank = 1; rank >= 0; rank--) {
      for (let i = 0; i < 9; i++) {
        const px = x + (i - 4) * mix(8.6, 9.6, deploy) + rank * 3;
        const py = y - deploy * 16 + rank * 13 + impact * (rank ? 1 : 3) +
          (1 - deploy) * Math.sin(time * 19 + i * 0.5 + rank) * 2;
        soldier(px, py, false, 6.15, i + rank);
        const spearX = px + 4.6;
        const spearY = py - 14 - deploy * 12 - thrust * 9 - salute * 17;
        line(ctx, "#64472f", 2.2, [[spearX, py + 5], [spearX + (1 - deploy) * 9 - salute * 3, spearY]]);
        polygon(ctx, "#f5e4a6", [spearX - 2 - salute * 3, spearY + 3,
          spearX + (1 - deploy) * 9 - salute * 3, spearY - 4, spearX + 2 - salute * 3, spearY + 3]);
        ctx.fillStyle = "#c8974f";
        ctx.beginPath();
        ctx.ellipse(px, py - 6, 4.4, 3.7, 0, Math.PI, TAU);
        ctx.fill();
        rect(ctx, "#fff0a0", px - 3.9, py - 6, 7.8, 1.8);
        if (rank) continue;
        const shieldY = py - mix(-3, 1.5, deploy) - lock * 3;
        for (let ring = 0; ring < 3; ring++) {
          ctx.fillStyle = ["#584e3d", "#edc577", "#347c9e"][ring];
          ctx.beginPath();
          ctx.ellipse(px, shieldY, [6.5, 5.6, 3.7][ring] * (locked ? 1 : 0.68 + deploy * 0.06),
            [6.5, 5.6, 3.7][ring], 0, 0, TAU);
          ctx.fill();
        }
        rect(ctx, "#fff0ae", px - 1.2, shieldY - 1.2, 2.4, 2.4);
      }
    }
  }

  function effects(local, time) {
    figures.airborne(local.flights.active);
    metrics.flights += local.flights.active.length;
    const age = time - local.pulse;
    if (age >= 0.19) return;
    ctx.globalAlpha = (1 - age / 0.19) * 0.92;
    for (let i = 0; i < 7; i++) {
      const lane = Math.sin(local.pulse * 17 + i * 2.39);
      const d = lane * (33 + age * 80);
      rect(ctx, i % 2 ? "#fff2c4" : "#ffd37b", local.x + d,
        local.y - age * (24 + i * 9) + Math.cos(i * 4) * 9, 2 + local.intensity, 2 + i % 3);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    metrics.figures = metrics.stamps = metrics.reserveSilhouettes = metrics.represented = 0;
    metrics.flights = metrics.cohorts = metrics.transferCohorts = metrics.flankCohorts = metrics.joins = 0;
    const sim = battle.state;
    const { left, right } = sim.lanes;
    const time = sim.time + state.victoryElapsed + (state.defeatElapsed ?? 0);
    const playing = state.mode === "playing";
    const won = sim.outcome === "victory";
    const encircled = sim.siege.phase === "encirclement";
    const wall = sim.phalanx.phase === "secured" || sim.phalanx.phase === "pushing";
    const rearFront = sim.siege.rearFront;
    west.flights.step(time);
    east.flights.step(time);
    rear.flights.step(time);
    const westFront = left.front;
    const eastFront = right.front - (won ? victoryAdvance(right.front, 98, state.victoryElapsed) : 0);
    Object.assign(renderState, { leftBlue: left.blueTotal, rightBlue: right.blueTotal,
      leftRed: left.redTotal, rightRed: right.redTotal, phase: sim.phalanx.phase,
      transfers: sim.siege.transfers.length, flank: Boolean(sim.siege.flank) });
    for (const [lane, local, front] of [[left, west, westFront], [right, east, eastFront]]) {
      const engaged = playing && lane.redTotal > 0 && (lane.blueTotal > 0 || (lane === left && wall));
      local.dynamics.step(time, front, lane, engaged, battle.feedback[lane.id].arrivalAt,
        Math.min(1, local.intensity), Math.min(1, (lane.blueTotal + lane.redTotal) / 700));
    }
    rear.dynamics.step(time, rearFront, left, encircled, -Infinity, 0, 1);
    const rearContact = encircled || sim.siege.phase === "flanking";
    const rearRed = encircled ? left.redTotal * 0.27 : 0;
    const rearDepth = Math.max(14, (westFront - rearFront) * 0.32);
    const westDepth = encircled ? westFront - rearFront - rearDepth
      : rearContact ? westFront - rearFront - 7 : Math.max(35, westFront - 55);
    const westBalance = wall ? 0 : encounterBalance(left.bluePressure, left.redPressure);
    const eastBalance = encounterBalance(right.bluePressure, right.redPressure);
    formation(left.redTotal - rearRed, playing ? left.blueTotal || Number(wall) * 850 : 0,
      true, "left", westFront, westDepth, west, time, battle.feedback.left.direction,
      false, rearContact ? 0 : left.redEntryRate, encircled ? 106 : 144, encircled ? 470 : 588, -westBalance);
    if (encircled) formation(rearRed, sim.siege.flank.count, true, "left", rearFront,
      rearDepth, rear, time, 1, true, 0, 38, 118);
    formation(right.redTotal, playing ? right.blueTotal : 0, true, "right", right.front,
      Math.max(26, right.front - 55), east, time, battle.feedback.right.direction, false, right.redEntryRate, 144, 588, -eastBalance);
    let westPending = 0, eastPending = 0;
    for (let i = arrivals.length - 1; i >= 0; i--) {
      const arrival = arrivals[i];
      const pending = 1 - mergeProgress(time - arrival.joinedAt);
      if (!pending || !playing) arrivals.splice(i, 1);
      else if (arrival.laneId === "left") westPending += arrival.count * pending;
      else eastPending += arrival.count * pending;
    }
    formation(Math.max(0, left.blueTotal - westPending), playing ? left.redTotal : 0,
      false, "left", left.front + (wall ? 28 : 0), Math.max(35, 516 - left.front - (wall ? 28 : 0)), west, time, battle.feedback.left.direction, false, 0, 144, 588, westBalance);
    formation(Math.max(0, right.blueTotal - eastPending), playing ? right.redTotal : 0, false, "right", eastFront,
      Math.max(33, 474 - eastFront), east, time, battle.feedback.right.direction, false, 0, 144, 588, eastBalance);
    westContact[0] = westX(withdrawalFront);
    westContact[1] = withdrawalFront + 12;
    withdrawalRally[1] = Math.max(westRally[1], withdrawalFront + 24);
    receiverAt = time;
    for (const lane of [left, right]) {
      for (const squad of lane.squads) {
        launchPoint[0] = squad.origin ?? entry[0];
        launchPoint[1] = entry[1] + 15;
        column(squad, time);
      }
    }
    for (const cohort of sim.siege.transfers) column(cohort, time);
    for (const cohort of arrivals) column(cohort, time);
    if (sim.siege.phase === "flanking") column(sim.siege.flank, time);
    if ((encircled || won) && sim.siege.flank) {
      metrics.flankCohorts = 1;
      const advance = won ? smoothStep(state.victoryElapsed / 0.8) * 24 : 0;
      formation(sim.siege.flank.count, playing ? left.redTotal : 0,
        false, "left", rearFront + advance, Math.min(117, rearFront - 55), rear, time, -1, true);
    }
    phalanx(sim, time);
    if (playing || (won && state.victoryElapsed < 0.72)) {
      effects(west, time);
      effects(east, time);
      effects(rear, time);
    }
    const join = time - joinedAt;
    if (playing && join < 0.28) {
      const reach = (12 + join * 73) * (joinedCount >= 100 ? 1.6 : 1);
      ctx.globalAlpha = (1 - join / 0.28) * 0.78;
      line(ctx, "#b7efff", joinedCount >= 100 ? 3 : 1.6,
        [[eastContact[0] - reach, eastContact[1] + 4], [eastContact[0], eastContact[1] - 3],
          [eastContact[0] + reach, eastContact[1] + 4]]);
      ctx.globalAlpha = 1;
    }
    if (routed && state.victoryElapsed < 1.15) {
      const p = smoothStep(state.victoryElapsed / 1.15);
      ctx.globalAlpha = 1 - p;
      for (let i = 0; i < Math.min(86, Math.ceil(Math.sqrt(routed.count) * 1.6)); i++) {
        soldier(71 + (i % 9) * 11 - p * (39 + i % 10 * 3),
          195 + Math.floor(i / 9) * 7 - p * (127 + i % 7 * 4), true, 4.7, i);
      }
      ctx.globalAlpha = 1;
    }
    const flagY = 126, flagX = 355;
    const raise = won ? smoothStep((state.victoryElapsed - FLAG_CAPTURE_TIME) / FLAG_RAISE_TIME) : 0;
    const flagTop = raise > 0 ? mix(flagY - 1, flagY - 33, raise)
      : mix(flagY - 33, flagY - 1, breakthroughAt < 0 ? 0 : smoothStep((time - breakthroughAt) / 0.46));
    rect(ctx, "#e2d0a1", flagX, flagY - 36, 3, 41);
    const flutter = Math.sin(time * 15) * 2;
    polygon(ctx, raise > 0 ? "#41b2ff" : "#dd6856",
      [flagX, flagTop, flagX + 33, flagTop + flutter, flagX + 28, flagTop + 7,
        flagX + 34, flagTop + 13 + flutter, flagX, flagTop + 13]);
    if (won && raise > 0) {
      for (let i = 0; i < 18; i++) {
        const p = clamp((state.victoryElapsed - FLAG_CAPTURE_TIME) / 1.55, 0, 1);
        if (p === 1) break;
        ctx.globalAlpha = 1 - p;
        rect(ctx, i % 2 ? "#98e9ff" : "#ffe19b", flagX + Math.cos(i * 2.4) * p * 89,
          flagY + Math.sin(i * 2.4) * p * 50 + p * p * 29, 3, 4);
      }
      ctx.globalAlpha = 1;
    }
    for (const lane of [left, right]) {
      if (!battle.feedback[lane.id].danger) continue;
      ctx.globalAlpha = 0.65 + Math.sin(time * 13) * 0.27;
      const x = center(lane.id, 472);
      polygon(ctx, "#ff9877", [x, 468, x - 11, 487, x + 11, 487]);
      rect(ctx, "#592a2d", x - 1.5, 474, 3, 6);
      rect(ctx, "#592a2d", x - 1.5, 482, 3, 2);
      ctx.globalAlpha = 1;
    }
  }

  function snapshot() {
    const flights = [...west.flights.active, ...east.flights.active, ...rear.flights.active];
    return { ...renderState, metrics: { ...metrics }, shieldAt, thrustAt, lockAt,
      joinedAt, joinedCount, breakthroughAt, routed, nonlethal: flights.filter(cat => !cat.defeated).length,
      defeated: flights.filter(cat => cat.defeated).length };
  }

  return {
    terrain, draw, reset, receive, snapshot,
    frame() {
      return { ...metrics, time: state.t, mode: state.mode, phalanx: renderState.phase,
        phase: battle.state.siege.phase, siege: state.gates[5].open,
        west99: state.gates[1].open, east99: state.gates[4].open,
        transfers: renderState.transfers };
    },
    recordDraw(ms) { metrics.drawMs = ms; },
  };
}
