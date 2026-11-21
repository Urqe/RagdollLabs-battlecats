import { H, LEVEL, TAU, W } from "./config.js";

const walls = [
  [17, 0],
  [21, 108],
  [43, 150],
  [108, 198],
  [167, 243],
  [167, 283],
  [127, 341],
  [81, 398],
  [28, 477],
  [13, 527],
  [13, 712],
];

export function laneHalfWidth(y) {
  if (y < 120) return 177 - y * 0.08;
  if (y < 245) return 168 - (y - 120) * 1.08;
  if (y < 284) return 31;
  return Math.min(185, 32 + (y - 284) * 0.71);
}

export function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function wall(ctx, x1, y1, x2, y2) {
  const spacing = Math.hypot(x2 - x1, y2 - y1);
  const nx = ((y2 - y1) / spacing) * 8;
  const ny = ((x1 - x2) / spacing) * 8;
  polygon(ctx, "#26302b36", [
    x1 - nx,
    y1 - ny + 5,
    x2 - nx,
    y2 - ny + 5,
    x2 + nx + 15,
    y2 + ny + 22,
    x1 + nx + 15,
    y1 + ny + 22,
  ]);
  polygon(ctx, "#57574e", [
    x1 + nx,
    y1 + ny,
    x2 + nx,
    y2 + ny,
    x2 + nx,
    y2 + ny + 12,
    x1 + nx,
    y1 + ny + 12,
  ]);
  polygon(ctx, "#999987", [
    x1 - nx,
    y1 - ny,
    x2 - nx,
    y2 - ny,
    x2 + nx,
    y2 + ny,
    x1 + nx,
    y1 + ny,
  ]);
  const blocks = Math.ceil(spacing / 14);
  for (let i = 0; i < blocks; i++) {
    const x = x1 + ((x2 - x1) * i) / blocks;
    const y = y1 + ((y2 - y1) * i) / blocks;
    const dx = ((x2 - x1) * 0.89) / blocks;
    const dy = ((y2 - y1) * 0.89) / blocks;
    const top = i % 2 === 0 ? 4 : 0;
    polygon(ctx, i % 3 === 1 ? "#babcaa" : "#c9c8b6", [
      x - nx,
      y - ny - top,
      x + dx - nx,
      y + dy - ny - top,
      x + dx + nx,
      y + dy + ny - top,
      x + nx,
      y + ny - top,
    ]);
    if (top)
      polygon(ctx, "#838475", [
        x + nx,
        y + ny - top,
        x + dx + nx,
        y + dy + ny - top,
        x + dx + nx,
        y + dy + ny,
        x + nx,
        y + ny,
      ]);
  }
}

export function drawTerrain(ctx, cutoff = LEVEL.reinforcementCutoff) {
  const grass = ctx.createLinearGradient(0, 0, W, H);
  grass.addColorStop(0, "#5f7351");
  grass.addColorStop(0.55, "#405948");
  grass.addColorStop(1, "#738359");
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, W, H);

  const floor = ctx.createLinearGradient(0, 0, 0, H);
  floor.addColorStop(0, "#a09b87");
  floor.addColorStop(0.32, "#b4ad97");
  floor.addColorStop(0.4, "#a8a493");
  floor.addColorStop(0.7, "#b9b5a0");
  floor.addColorStop(1, "#92988e");
  const outline = walls.flat();
  for (let i = walls.length - 1; i >= 0; i--) {
    outline.push(W - walls[i][0], walls[i][1]);
  }
  polygon(ctx, floor, outline);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "#615f512b";
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  for (let row = 0, y = 6; y < 715; row++, y += 12 + y * 0.055) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    const step = 17 + y * 0.057;
    for (let x = (row % 2) * step * 0.5; x < W; x += step) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + (x - W / 2) * 0.035, y + 12 + y * 0.055);
    }
  }
  ctx.stroke();
  for (let i = 0; i < 310; i++) {
    const x = (i * 141.37) % W;
    const y = (i * 53.87) % H;
    ctx.fillStyle = i % 2 ? "#eae2c420" : "#48473d20";
    ctx.fillRect(x, y, 1.2 + (i % 7) * 0.5, 0.65 + (i % 3) * 0.4);
  }
  ctx.restore();

  // The paving across the mustering ground marks the supply entrance.
  const y = cutoff;
  ctx.fillStyle = "#726c5c3d";
  ctx.fillRect(26, y - 4, W - 52, 9);
  ctx.fillStyle = "#e2d5aa6d";
  ctx.fillRect(28, y - 4, W - 56, 1.4);
  for (let x = 34; x < W - 33; x += 15) {
    ctx.fillRect(x, y - 3, 1, 7);
  }
  ctx.fillStyle = "#807c6b";
  ctx.fillRect(171, 244, 78, 46);
  for (let step = 248; step < 288; step += 9) {
    ctx.fillStyle = "#cbc7b4";
    ctx.fillRect(171, step, 78, 4);
    ctx.fillStyle = "#a09f8d";
    ctx.fillRect(171, step + 4, 78, 3);
  }

  for (let side = 0; side < 2; side++) {
    ctx.save();
    if (side) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    for (let i = 0; i < 72; i++) {
      const y = 145 + ((i * 73.79) % 340);
      const edge = 204 - laneHalfWidth(y);
      const x = (i * 42.17) % Math.max(1, edge - 10);
      const r = 2 + (i % 6) * 1.1;
      ctx.fillStyle = i % 3 === 0 ? "#273e34" : "#779064";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r, 0, 0, TAU);
      ctx.fill();
    }
    for (let i = 1; i < walls.length; i++) {
      wall(ctx, ...walls[i - 1], ...walls[i]);
    }
    polygon(ctx, "#353e36", [149, 244, 171, 244, 171, 274, 149, 274]);
    polygon(ctx, "#a8a897", [140, 238, 161, 229, 173, 238, 151, 247]);
    polygon(ctx, "#6e7166", [140, 238, 151, 247, 151, 270, 140, 260]);
    polygon(ctx, "#8d8c7f", [151, 247, 173, 238, 173, 261, 151, 270]);
    ctx.restore();
  }
  ctx.fillStyle = "#393f40";
  ctx.fillRect(10, 727, W - 20, 33);
  ctx.fillStyle = "#7c827a";
  ctx.fillRect(10, 720, W - 20, 11);
  for (let x = 12; x < W - 20; x += 37) {
    ctx.fillStyle = "#b3b6a7";
    ctx.fillRect(x, 711, 22, 9);
    ctx.fillStyle = "#5a6260";
    ctx.fillRect(x, 720, 22, 11);
  }
}
