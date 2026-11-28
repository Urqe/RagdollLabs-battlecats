import { TAU, clamp } from "./config.js";
import { polygon } from "./terrain.js";

const DEBRIS_DIRECTIONS = Array.from({ length: 12 }, (_, i) => {
  const angle = i * TAU / 12;
  return [Math.cos(angle), Math.sin(angle)];
});

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function yarn(ctx, x, y, radius, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ellipse(ctx, 0, 0, radius, radius * 0.93, "#94416d");
  ellipse(
    ctx,
    -radius * 0.12,
    -radius * 0.16,
    radius * 0.8,
    radius * 0.72,
    "#f6a6ba",
  );
  ctx.beginPath();
  ctx.lineWidth = Math.max(1, radius * 0.095);
  ctx.strokeStyle = "#a45583";
  for (let i = -2; i <= 2; i++) {
    const offset = i * radius * 0.28;
    ctx.moveTo(offset - radius * 0.29, -radius * 0.76);
    ctx.quadraticCurveTo(
      offset + radius * 0.6,
      0,
      offset - radius * 0.14,
      radius * 0.77,
    );
  }
  ctx.stroke();
  ctx.restore();
}

export function drawCatapult(ctx, state, figures) {
  const config = state.level.support;
  const support = state.support;
  const { x, y } = config;
  const shot = support.shot;
  const isPlaying = state.mode === "playing";
  const recoil =
    isPlaying && shot ? clamp(1 - (state.t - shot.launchedAt) / 0.25, 0, 1) : 0;
  const load = support.open
    ? clamp(1 - (support.readyAt - state.t) / config.reload, 0, 1)
    : 0;

  ellipse(ctx, x + 5, y + 1, 34, 12, "#25252848");
  polygon(ctx, "#68432e", [
    x - 31,
    y - 5,
    x + 27,
    y - 7,
    x + 32,
    y + 1,
    x - 29,
    y + 5,
  ]);
  polygon(ctx, "#b68053", [
    x - 26,
    y - 12,
    x + 27,
    y - 13,
    x + 29,
    y - 7,
    x - 27,
    y - 5,
  ]);
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 20, y + 1, 8, 8, "#45352e");
    ellipse(ctx, x + side * 20, y + 1, 5, 5, "#b78454");
    ellipse(ctx, x + side * 20, y + 1, 2, 2, "#483731");
  }
  polygon(ctx, "#73503b", [
    x - 22,
    y - 10,
    x - 5,
    y - 37,
    x + 8,
    y - 37,
    x + 25,
    y - 13,
  ]);
  polygon(ctx, "#c69465", [
    x - 12,
    y - 13,
    x - 2,
    y - 30,
    x + 5,
    y - 30,
    x + 15,
    y - 14,
  ]);
  ctx.save();
  ctx.translate(x + 1, y - 32);
  ctx.rotate(load * 0.65 - recoil * 1.5 + 0.13);
  polygon(ctx, "#6f4531", [-23, -3, 20, -4, 22, 4, -23, 3]);
  ctx.fillStyle = "#dfa973";
  ctx.fillRect(-23, -4, 44, 3);
  ellipse(ctx, -23, -5, 9, 3.5, "#a16c44");
  if (!shot && load > 0.53) yarn(ctx, -23, -10, 8.5, -load * 0.4);
  ctx.restore();

  const wakeAge = state.t - support.unlockedAt;
  const wake =
    support.open && wakeAge < 0.42 ? Math.sin((wakeAge / 0.42) * Math.PI) : 0;
  figures.crew(x - 26, y - 18 - load * 4 - wake * 15, load * 8);
  figures.crew(x + 23, y - 17 + recoil * 3 - wake * 10, 2 + load * 6);
  if (!support.open) return;
  ctx.fillStyle = "#312d35";
  ctx.fillRect(x - 24, y + 13, 48, 5);
  ctx.fillStyle = shot ? "#ffd0de" : "#e6a769";
  ctx.fillRect(x - 23, y + 14, 46 * (shot ? 1 : load), 3);
}

export function drawArtilleryShot(ctx, state, project = y => y) {
  const { support, level, t } = state;
  const shot = support.shot;
  if (!shot) return;
  const progress = clamp((t - shot.launchedAt) / level.support.flight, 0, 1);
  const x = level.support.x - 14 + (shot.x - (level.support.x - 14)) * progress;
  const floor =
    level.support.y - 30 + (project(shot.y) - (level.support.y - 30)) * progress;
  const lift = Math.sin(progress * Math.PI) * 132;
  ellipse(ctx, x, floor + 4, 10 - lift * 0.042, 3.1, "#24233537");
  yarn(ctx, x, floor - lift, 13 - progress * 1.8, progress * 11);
}

export function drawImpactGround(ctx, hit, age) {
  if (age < 0 || age >= 0.66) return;
  const spread = age / 0.66;
  const x = hit.x;
  const y = hit.y;
  const force = hit.force;
  ctx.save();
  ctx.globalAlpha = (1 - spread) * (0.36 + force * 0.34);
  ellipse(ctx, x, y, 9 + spread * hit.radiusX, 5 + spread * hit.radiusY, "#4c3131");
  ctx.restore();
}

export function drawImpactBurst(ctx, hit, age) {
  if (!(age >= 0 && age < 0.52)) return;
  const progress = age / 0.52;
  const spread = 1 - (1 - progress) ** 2;
  const { x, y, force, radiusX, radiusY } = hit;
  ctx.save();
  ctx.globalAlpha = (1 - progress) ** 2 * (0.48 + force * 0.48);
  ctx.strokeStyle = "#ffe7af";
  ctx.lineWidth = 1 + (1 - progress) * (1 + force * 3.5);
  ctx.beginPath();
  ctx.ellipse(x, y, 7 + spread * radiusX * 1.55,
    4 + spread * radiusY * 1.33, 0, 0, TAU);
  ctx.stroke();

  ctx.globalAlpha = (1 - progress) ** 2 * (0.44 + force * 0.42);
  ctx.strokeStyle = "#ffc279";
  ctx.lineWidth = 1 + force * 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 4 + spread * radiusX, 3 + spread * radiusY, 0, 0, TAU);
  ctx.stroke();
  if (age < 0.14) {
    ctx.globalAlpha = (1 - age / 0.14) * force * 0.55;
    ellipse(ctx, x, y, 13 + spread * 38, 7 + spread * 21, "#fff1c6");
  }

  const particles = 4 + Math.round(force * 8);
  ctx.globalAlpha = (1 - progress) ** 2 * (0.52 + force * 0.36);
  for (let i = 0; i < particles; i++) {
    const [dx, dy] = DEBRIS_DIRECTIONS[i];
    const reach = 0.75 + (i % 4) * 0.17;
    const px = x + dx * (5 + spread * radiusX * reach);
    const py = y + dy * (3 + spread * radiusY * reach)
      - Math.sin(progress * Math.PI) * (5 + i % 3 * 6) * (0.5 + force * 0.5);
    const puff = (2.5 + spread * 6) * (0.45 + force * 0.55);
    ellipse(ctx, px, py, puff, puff * 0.63, i % 3 ? "#d8af87" : "#fff0c8");
    if (i % 3 === 0) {
      ctx.fillStyle = "#9f7154";
      ctx.fillRect(px + dx * 5, py - 3, 2 + force * 3, 2);
    }
  }
  if (age < 0.17) {
    ctx.globalAlpha = 1 - age / 0.17;
    yarn(ctx, x, y - age * (18 + force * 14), 11 + age * 29, age * 20);
  }
  ctx.restore();
}
