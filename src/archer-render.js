import { clamp, TAU } from "./config.js";
import { laneHalfWidth, polygon } from "./terrain.js";
import { armyScale, fieldColumn, fieldRow } from "./army-visual.js";
import { rowsAt } from "./army-continuity.js";

const DRAW_TIME = 0.22;
const RECOVERY = 0.19;
export const ARROW_AFTERMATH_LIFE = 0.56;
const CREW_SIZE = 6;
const RELEASE_STEP = 0.022;
export const MAX_VISUAL_ARROWS = 12;

function crewPosition(index) {
  const row = Math.floor(index / 3);
  return { x: -21 + (index % 3) * 21 + row * 5, y: -32 + row * 15 };
}

// Choose distinct nearby occupied rank slots before reusing any. The same
// timestamp seeds the launch and the resolved impact, even on replay.
export function arrowSpread(event, front, population) {
  const { field } = armyScale(population);
  const tip = front - 6;
  const step = Math.min((tip - 3) * 0.59 / Math.max(1, rowsAt(field)), 8.9);
  const slots = [];
  for (let slot = 0; slot < field; slot++) {
    const row = fieldRow(slot);
    const y = tip - row * step;
    const lane = laneHalfWidth(y) - 6;
    const spacing = Math.min(12.5, lane / Math.min(7, 2 + row));
    const x = event.x + clamp(fieldColumn(slot) * spacing, -lane, lane);
    if (Math.abs(y - event.y) <= 45) slots.push({ slot, x, y });
  }
  const seed = Math.round(event.launchedAt * 1000);
  const points = [];
  const count = Math.min(MAX_VISUAL_ARROWS, event.arrows * 2);
  for (let i = 0; i < count; i++) {
    const stripe = (i * 5 + seed) % CREW_SIZE;
    const x = event.x + (stripe - 2.5) * 21 + Math.sin(seed + i * 3.9) * 8;
    const y = event.y + Math.sin(seed * 0.13 + i * 2.39) * 20;
    let best = Infinity;
    let nearest = -1;
    for (let j = 0; j < slots.length; j++) {
      const slot = slots[j];
      const score = (slot.x - x) ** 2 + 1.6 * (slot.y - y) ** 2;
      if (score >= best) continue;
      best = score;
      nearest = j;
    }
    const point = nearest < 0
      ? points[i % Math.max(1, points.length)] ?? { x: event.x, y: event.y }
      : slots.splice(nearest, 1)[0];
    points.push(point);
  }
  return points;
}

export function reactToArrows(airborne, impact, remaining) {
  if (impact.loss <= 0) return;
  const { field } = armyScale(remaining);
  const dramatic = Math.floor(impact.launchedAt) % 4 === 2;
  const used = new Set();
  const strikes = impact.points.slice(0, CREW_SIZE);
  const defeatedPoint = dramatic
    ? strikes.reduce((outer, point) =>
      Math.abs(point.x - impact.x) > Math.abs(outer.x - impact.x) ? point : outer)
    : strikes[1];
  if (impact.loss >= 1 && defeatedPoint) {
    const { x, y, slot } = defeatedPoint;
    used.add(slot);
    const outward = x < impact.x ? -1 : 1;
    airborne.launch({
      at: impact.at, x, y, red: true, defeated: true, fromImpact: true,
      vx: outward * (dramatic ? 111 : 62), vy: -24,
      lift: dramatic ? 202 : 133, spin: outward * (dramatic ? 13 : 10),
      bounce: 0.18, intensity: 4,
    });
  }
  let count = 0;
  for (const { x, y, slot } of strikes) {
    if (slot === undefined || slot >= field || used.has(slot)) continue;
    used.add(slot);
    const sideways = x < impact.x ? -1 : 1;
    const launched = airborne.launch({
      at: impact.at + count * 0.027, x, y, slot, red: true, fromImpact: true,
      vx: sideways * (45 + count * 23), vy: -16 - count * 6,
      lift: 78 + count * 26, spin: sideways * (6 + count * 2),
      bounce: count === 1 ? 0.15 : 0,
      // Give each volley one chance to reclaim a weaker melee casualty.
      intensity: count === 0 ? 3.5 : 2,
    });
    if (launched && ++count === 3) break;
  }
}

function stroke(ctx, color, width, points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.stroke();
}

export function archerPose(clock, readyAt, launch, index = 0) {
  const delay = index * RELEASE_STEP;
  const sinceLaunch = clock - (launch?.launchedAt ?? -Infinity);
  const age = sinceLaunch - delay;
  const until = sinceLaunch >= 0 && age < 0 ? -age
    : readyAt > clock ? readyAt - clock + delay : 0;
  const draw = until > 0 ? clamp(1 - until / DRAW_TIME, 0, 1) : 0;
  const release = age >= 0 ? clamp(1 - age / RECOVERY, 0, 1) : 0;
  return { draw, release };
}

export function drawArcherCrew(ctx, state, figures, launch, clock) {
  const { x, y } = state.level.support;
  const active = state.mode === "playing" && state.support.open;
  const aim = launch && active
    ? Math.atan2(launch.y - y, launch.x - x)
    : Math.atan2(-220, state.level.battlefield.width / 2 - x);

  ctx.save();
  ctx.translate(x, y + 12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  polygon(ctx, "#292b3455", [-34, 8, 27, 8, 39, 19, -21, 20]);
  polygon(ctx, "#6a472f", [-34, -10, 32, -10, 32, 8, -32, 10]);
  polygon(ctx, "#b98052", [-35, -33, 25, -33, 35, -10, -34, -9]);
  stroke(ctx, "#8f5d39", 1.6, [-32, -22, 30, -23]);
  stroke(ctx, "#e6ad73", 2, [-33, -9, 34, -11]);

  for (let i = 0; i < CREW_SIZE; i++) {
    const { x: catX, y: catY } = crewPosition(i);
    const { draw, release } = active
      ? archerPose(clock, state.support.readyAt, launch, i)
      : { draw: 0, release: 0 };
    figures.crew(catX + draw * 2, catY, 2 + draw * 4);
    ctx.save();
    ctx.translate(catX - 5, catY - 2);
    ctx.rotate(aim + 0.57 * (1 - Math.max(draw, release)));
    ctx.translate(2 * draw - 2 * release, 0);
    const string = -2 - draw * 7 + release * 2;
    stroke(ctx, "#fff0c7", 1.1, [-2, -7, string, 0, -2, 7]);
    ctx.beginPath();
    ctx.moveTo(-2, -7);
    ctx.quadraticCurveTo(10 - draw * 3, 0, -2, 7);
    ctx.strokeStyle = "#563a31";
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = "#f3ba72";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (draw > 0) stroke(ctx, "#ffefbb", 1.3, [string, 0, 8, 0]);
    ctx.restore();
  }
  polygon(ctx, "#8d593b", [-35, -9, 35, -11, 35, -5, -35, -3]);
  ctx.fillStyle = "#4a98d6";
  ctx.fillRect(-28, -5, 12, 9);
  stroke(ctx, "#d2f5ff", 1.5, [-26, 0, -18, 0]);
  ctx.restore();
}

// Each crew member has two visual shafts. All arrive at the same
// authoritative impact time, irrespective of their release offsets.
export function arrowPosition(launch, clock, index) {
  const { originX, originY, launchedAt, impactAt } = launch;
  const crew = crewPosition(index % CREW_SIZE);
  const startX = originX + crew.x - 5;
  const startY = originY + crew.y + 10;
  const target = launch.points[index];
  const delay = (index % CREW_SIZE) * RELEASE_STEP + Math.floor(index / CREW_SIZE) * 0.019;
  const start = launchedAt + Math.min(delay, (impactAt - launchedAt) * 0.72);
  if (clock < start) return null;
  const p = clamp((clock - start) / (impactAt - start), 0, 1);
  const dx = target.x - startX;
  const dy = target.y - startY;
  const height = Math.min(33, Math.hypot(dx, dy) * 0.14) + index % 3 * 6;
  return {
    x: startX + dx * p,
    y: startY + dy * p - height * 4 * p * (1 - p),
    angle: Math.atan2(dy - height * (4 - 8 * p), dx),
  };
}

function arrow(ctx, x, y, angle, length) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  stroke(ctx, "#342936", 3.4, [-length, 0, -1, 0]);
  stroke(ctx, "#ffdea0", 1.6, [-length, 0, -1, 0]);
  polygon(ctx, "#fff2ce", [1, 0, -5, -2.6, -5, 2.6]);
  stroke(ctx, "#8ddaff", 1.8, [-length, -2, -length + 4, 0, -length, 2]);
  ctx.restore();
}

function puff(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

export function drawArcherVolley(ctx, clock, launch, impact) {
  if (launch?.points && clock < launch.impactAt) {
    for (let i = 0; i < launch.points.length; i++) {
      const position = arrowPosition(launch, clock, i);
      if (position) arrow(ctx, position.x, position.y, position.angle, 22 + (i % 3) * 3);
    }
  }

  const age = clock - (impact?.at ?? -Infinity);
  if (!impact?.points || age < 0 || age >= ARROW_AFTERMATH_LIFE) return;
  const strikes = Math.min(impact.points.length, CREW_SIZE);
  ctx.save();
  for (let i = 0; i < strikes; i++) {
    const { x, y, angle } = arrowPosition(impact, impact.at, i);
    const dust = age / 0.25;
    if (dust < 1) {
      ctx.globalAlpha = (1 - dust) * 0.9;
      const drift = (i % 2 ? -1 : 1) * dust;
      puff(ctx, x + drift * 7, y - dust * 4, 2.5 + dust * 5, 1.5 + dust * 2, "#ffdfad");
      puff(ctx, x - drift * 5, y - 2 - dust * 7, 2 + dust * 2, 1 + dust * 2, "#e7b88a");
    }
    if (i % 2 === 0) {
      ctx.globalAlpha = clamp((ARROW_AFTERMATH_LIFE - age) / 0.19, 0, 1);
      arrow(ctx, x, y, angle + (i - 2) * 0.13, 13);
    }
  }
  ctx.restore();
}
