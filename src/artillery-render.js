import { TAU, clamp } from "./config.js";
import { polygon } from "./terrain.js";

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

  figures.crew(x - 26, y - 18 - load * 4, load * 8);
  figures.crew(x + 23, y - 17 + recoil * 3, 2 + load * 6);
  if (!support.open) return;
  ctx.fillStyle = "#312d35";
  ctx.fillRect(x - 24, y + 13, 48, 5);
  ctx.fillStyle = shot ? "#ffd0de" : "#e6a769";
  ctx.fillRect(x - 23, y + 14, 46 * (shot ? 1 : load), 3);
}

export function drawArtilleryShot(ctx, state, figures) {
  const { support, level, t } = state;
  if (support.shot) {
    const { shot } = support;
    const progress = clamp((t - shot.launchedAt) / level.support.flight, 0, 1);
    const x =
      level.support.x - 14 + (shot.x - (level.support.x - 14)) * progress;
    const floor =
      level.support.y - 30 + (shot.y - (level.support.y - 30)) * progress;
    const lift = Math.sin(progress * Math.PI) * 132;
    ellipse(ctx, x, floor + 4, 10 - lift * 0.042, 3.1, "#24233537");
    yarn(ctx, x, floor - lift, 12 - progress * 2.2, progress * 10);
  }

  const hit = support.impact;
  if (!hit) return;
  const age =
    state.mode === "victory" || state.mode === "end"
      ? t + state.victoryElapsed - hit.at
      : t - hit.at;
  if (age >= 0.58) return;
  const time = age / 0.58;
  ctx.save();
  ctx.strokeStyle = hit.loss > 0 ? "#ffcdd3" : "#e2c0ac";
  ctx.globalAlpha = (1 - time) * 0.8;
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.ellipse(hit.x, hit.y, 7 + time * 41, 4 + time * 20, 0, 0, TAU);
  ctx.stroke();
  if (hit.loss > 0) {
    for (let i = 0; i < 12; i++) {
      const x = hit.x + Math.cos(i * 2.4) * (8 + time * (26 + (i % 4) * 4));
      const y =
        hit.y +
        Math.sin(i * 2.4) * (4 + time * 17) -
        Math.sin(time * Math.PI) * 12;
      ctx.fillStyle = i % 2 === 0 ? "#ffd7d7" : "#df82a7";
      ctx.fillRect(x, y, 3.5, 2);
      if (i < Math.min(6, Math.ceil(hit.loss / 380)) && state.redTotal > 0) {
        figures.scattered(x, y, i);
      }
    }
  }
  ctx.restore();
}
