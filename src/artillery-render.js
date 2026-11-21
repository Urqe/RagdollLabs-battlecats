import { TAU, clamp } from "./config.js";
import { polygon } from "./terrain.js";

const CAT_FLIGHT = 0.77;

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

export function drawArtilleryShot(ctx, state) {
  const { support, level, t } = state;
  const shot = support.shot;
  if (!shot) return;
  const progress = clamp((t - shot.launchedAt) / level.support.flight, 0, 1);
  const x = level.support.x - 14 + (shot.x - (level.support.x - 14)) * progress;
  const floor =
    level.support.y - 30 + (shot.y - (level.support.y - 30)) * progress;
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
  ctx.strokeStyle = "#ffe3c2";
  ctx.lineWidth = 2.2 - spread;
  ctx.beginPath();
  ctx.ellipse(
    x, y, 8 + spread * (26 + force * 38), 4 + spread * (15 + force * 16),
    0, 0, TAU,
  );
  ctx.stroke();
  ctx.restore();
}

export function drawImpactAir(ctx, figures, hit, age) {
  if (age < 0 || age >= CAT_FLIGHT + 0.1) return;
  const ring = Math.min(1, age / 0.49);
  if (ring < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - ring) * 0.88;
    for (let i = 0; i < 8; i++) {
      const angle = i * TAU / 8;
      const x = hit.x + Math.cos(angle) * (8 + ring * hit.radiusX);
      const y = hit.y + Math.sin(angle) * (5 + ring * hit.radiusY)
        - Math.sin(ring * Math.PI) * (6 + i % 3 * 3);
      ellipse(
        ctx, x, y, 2.3 + ring * 5, 1.6 + ring * 3,
        i % 3 ? "#e5bf9d" : "#ffe7c8",
      );
    }
    ctx.restore();
  }
  if (age < 0.16) {
    ctx.save();
    ctx.globalAlpha = 1 - age / 0.16;
    yarn(ctx, hit.x, hit.y - age * 23, 11 + age * 28, age * 16);
    ctx.restore();
  }

  for (let i = 0; i < hit.airborne; i++) {
    const progress = (age - (i % 4) * 0.019) / (CAT_FLIGHT - (i % 3) * 0.07);
    if (progress < 0 || progress >= 1) continue;
    const turn = i * 2.39996;
    const travel = 9 + progress * (32 + (i % 5) * 8) * (0.5 + hit.force * 0.5);
    const x = hit.x + Math.cos(turn) * travel;
    const ground = hit.y + (0.21 + Math.sin(turn) * 0.49) * travel;
    const lift = 4 * progress * (1 - progress) * (34 + (i % 4) * 10);
    const alpha = Math.min(1, (1 - progress) * 3.7);
    ctx.save();
    ctx.globalAlpha = alpha * 0.27;
    ellipse(ctx, x, ground + 2, 4.4 - lift * 0.031, 1.8, "#302536");
    ctx.translate(x, ground - lift);
    ctx.rotate(progress * (i % 2 ? -1 : 1) * (4.8 + i % 4));
    ctx.globalAlpha = alpha;
    const size = clamp(5.4 + ground * 0.0044 + lift * 0.02, 5.2, 8.1);
    figures.scattered(0, 0, size, i);
    ctx.restore();
  }
}
