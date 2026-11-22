import { clamp } from "./config.js";
import { polygon } from "./terrain.js";

const DRAW_TIME = 0.22;
const RECOVERY = 0.19;
const IMPACT_LIFE = 0.26;
const MAX_ARROWS = 6;

function stroke(ctx, color, width, points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.stroke();
}

export function archerPose(clock, readyAt, launch) {
  const until = readyAt - clock;
  const draw = until > 0 ? clamp(1 - until / DRAW_TIME, 0, 1) : 0;
  const age = clock - (launch?.launchedAt ?? -Infinity);
  const release = age >= 0 ? clamp(1 - age / RECOVERY, 0, 1) : 0;
  return { draw, release };
}

export function drawArcherCrew(ctx, state, figures, launch, clock) {
  const { x, y } = state.level.support;
  const active = state.mode === "playing" && state.support.open;
  const { draw, release } = active
    ? archerPose(clock, state.support.readyAt, launch)
    : { draw: 0, release: 0 };
  const aim = launch && active
    ? Math.atan2(launch.y - y, launch.x - x)
    : -2.2;

  ctx.save();
  ctx.translate(x, y + 12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  polygon(ctx, "#292b3455", [-34, 8, 27, 8, 39, 19, -21, 20]);
  polygon(ctx, "#6a472f", [-34, -10, 32, -10, 32, 8, -32, 10]);
  polygon(ctx, "#b98052", [-35, -33, 25, -33, 35, -10, -34, -9]);
  stroke(ctx, "#8f5d39", 1.6, [-32, -22, 30, -23]);
  stroke(ctx, "#e6ad73", 2, [-33, -9, 34, -11]);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const catX = -21 + col * 21 + row * 5;
      const catY = -32 + row * 15;
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
  }
  polygon(ctx, "#8d593b", [-35, -9, 35, -11, 35, -5, -35, -3]);
  ctx.fillStyle = "#4a98d6";
  ctx.fillRect(-28, -5, 12, 9);
  stroke(ctx, "#d2f5ff", 1.5, [-26, 0, -18, 0]);
  ctx.restore();
}

// The center of the cluster follows the event's fixed aim. Lift and fan
// are presentation offsets that vanish at both authoritative endpoints.
export function arrowPosition(launch, clock, fan) {
  const { originX, originY, x, y, launchedAt, impactAt } = launch;
  const p = clamp((clock - launchedAt) / (impactAt - launchedAt), 0, 1);
  const dx = x - originX;
  const dy = y - originY;
  const lift = 4 * p * (1 - p);
  const slope = 4 - 8 * p;
  const height = Math.min(37, Math.hypot(dx, dy) * 0.17);
  return {
    x: originX + dx * p + fan * lift,
    y: originY + dy * p - (height + fan * 0.35) * lift,
    angle: Math.atan2(dy - (height + fan * 0.35) * slope, dx + fan * slope),
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

export function drawArcherVolley(ctx, clock, launch, impact) {
  if (launch && clock >= launch.launchedAt && clock < launch.impactAt) {
    const count = Math.min(MAX_ARROWS, launch.arrows);
    for (let i = 0; i < count; i++) {
      const fan = (i - (count - 1) / 2) * 11;
      const { x, y, angle } = arrowPosition(launch, clock, fan);
      arrow(ctx, x, y, angle, 20);
    }
  }

  const age = clock - (impact?.at ?? -Infinity);
  if (age < 0 || age >= IMPACT_LIFE) return;
  const progress = age / IMPACT_LIFE;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  const count = Math.min(MAX_ARROWS, impact.arrows);
  for (let i = 0; i < count; i++) {
    const offset = i - (count - 1) / 2;
    const x = impact.x;
    const y = impact.y;
    const { angle } = arrowPosition(impact, impact.at, offset * 11);
    arrow(ctx, x, y, angle, 11);
    ctx.fillStyle = impact.loss > 0 ? "#fff0b4" : "#e2c6a1";
    ctx.fillRect(x + offset * (3 + 4 * progress), y + (i % 2 ? -8 : 6) * progress, 2, 2);
  }
  ctx.restore();
}
