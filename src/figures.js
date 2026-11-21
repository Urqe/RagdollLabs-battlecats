import { LEVEL, TAU, clamp } from "./config.js";
import { laneHalfWidth, polygon, yardSpacing } from "./terrain.js";

const colors = [
  "#df544b",
  "#b93843",
  "#379aff",
  "#1d72d3",
  "#83d9ff",
  "#a9eaff",
];
const RED = 0;
const DARK_RED = 1;
const BLUE = 2;
const DARK_BLUE = 3;
const BRIGHT_BLUE = 4;
const PROJECTILE = 5;
const CELL = 48;
const spacingNoise = new Float32Array(1232);
let seed = 1729;
for (let i = 0; i < spacingNoise.length; i++) {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  spacingNoise[i] = seed / 2 ** 32 - 0.5;
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function paintCat(ctx, color, frame, detail) {
  ellipse(ctx, 0.7, 3.5, 4.2, 1.8, "#20262c55");
  if (detail) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.quadraticCurveTo(5, 3, 5.5, 0.2);
    ctx.stroke();
    const stride = Math.sin((frame * TAU) / 4) * 1.25;
    ellipse(ctx, -1.65, 3.4 + stride, 1.05, 1.65, "#263345");
    ellipse(ctx, 1.65, 3.4 - stride, 1.05, 1.65, "#263345");
  }
  ellipse(ctx, 0, 1.5, 3.15, 3.35, color);
  polygon(
    ctx,
    color,
    [-3.45, -0.5, -3.7, -6.25, -0.9, -4.05, 0.9, -4.05, 3.7, -6.25, 3.45, -0.5],
  );
  ellipse(ctx, 0, -1.3, 3.65, 3.25, color);
  if (detail) {
    polygon(ctx, "#ffc5afac", [-2.97, -4.95, -1.57, -3.68, -2.96, -3.15]);
    polygon(ctx, "#ffc5afac", [2.97, -4.95, 1.57, -3.68, 2.96, -3.15]);
    ellipse(ctx, 0, 0.05, 2.1, 1.0, "#ffe9dcb0");
    ellipse(ctx, 0, 0.15, 0.43, 0.31, "#273044");
    ellipse(ctx, -1.48, -1.5, 0.5, 0.62, "#242b3b");
    ellipse(ctx, 1.48, -1.5, 0.5, 0.62, "#242b3b");
    ellipse(ctx, -1.15, 2.25, 1.6, 0.48, "#ffffff35");
  }
}

export function redFormationSize(count) {
  return Math.ceil(
    (450 * count) / (count + 2200) + (780 * count) / (count + 25000),
  );
}

export function waveSize(count) {
  return Math.min(count, Math.ceil(Math.sqrt(count) * 0.65));
}

export function createFigures(ctx, ownerDocument) {
  // Four stride poses and one simplified distant pose per tint in one atlas.
  const atlas = ownerDocument?.createElement("canvas");
  if (atlas) {
    atlas.width = CELL * 5;
    atlas.height = CELL * colors.length;
    const sprites = atlas.getContext("2d");
    for (let i = 0; i < colors.length; i++) {
      for (let pose = 0; pose < 5; pose++) {
        sprites.setTransform(3, 0, 0, 3, CELL * (pose + 0.5), CELL * (i + 0.5));
        paintCat(sprites, colors[i], pose, pose !== 4);
      }
    }
  }
  let clock = 0;
  function cat(x, y, tint, size, phase) {
    const detail = size >= 4.25;
    const pose = detail ? Math.floor(clock * 13 + phase) & 3 : 4;
    const bob = (pose === 1 || pose === 3) && detail ? 0.62 : 0;
    const span = size * 3.2;
    if (atlas) {
      ctx.drawImage(
        atlas,
        CELL * pose,
        CELL * tint,
        CELL,
        CELL,
        x - span / 2,
        y - span / 2 + bob,
        span,
        span,
      );
    } else {
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.scale(size / 5, size / 5);
      paintCat(ctx, colors[tint], pose, detail);
      ctx.restore();
    }
  }

  function redArmy(state, nearGates) {
    const count = redFormationSize(state.redTotal);
    if (count === 0) return;
    const tip = state.front - 3;
    const yardEnd = yardSpacing(state.front);
    const reserve = Math.floor(count * 0.76);
    const rows = Math.min(reserve, Math.max(1, Math.floor(yardEnd / 7)));
    if (!nearGates) {
      // Spread the reserve across the yard. Row spacing and occupancy follow the
      // surviving head count while the trailing ranks keep moving toward battle.
      for (let row = 0; row < rows; row++) {
        const start = Math.floor((row * reserve) / rows);
        const cols = Math.floor(((row + 1) * reserve) / rows) - start;
        const depth = yardEnd / rows;
        const y = (((row + 0.2) * depth + clock * 12) % yardEnd) - depth * 0.15;
        const half = laneHalfWidth(y);
        for (let col = 0; col < cols; col++) {
          const i = start + col;
          const cell = (2 * half) / cols;
          const stagger = spacingNoise[i] * Math.min(cell * 0.55, 9);
          const staggerY =
            spacingNoise[(i + 271) % spacingNoise.length] *
            Math.min(depth * 0.7, 6);
          const x =
            210 +
            (((col + 0.5) / cols) * 2 - 1) * half +
            stagger +
            (row % 2 === 0 ? -0.18 : 0.18) * cell;
          cat(
            x,
            Math.min(tip - 1, y + staggerY),
            i % 5 === 0 ? DARK_RED : RED,
            clamp(3.5 + y * 0.006, 3.4, 4.7),
            i * 0.71,
          );
        }
      }
      const files = Math.min(12, Math.ceil(state.redEntryRate / 240));
      for (let file = 0; file < files; file++) {
        const track = ((file + 0.5) / files) * 2 - 1;
        for (let mark = 0; mark < 6; mark++) {
          const y = ((clock * 21 + file * 8 + mark * 17) % 102) - 12;
          if (y >= Math.min(yardEnd, tip)) continue;
          const x = 210 + track * laneHalfWidth(y) * 0.95;
          cat(x, y, DARK_RED, 3.55, file * 1.7 + mark);
        }
      }
    }

    const lead = count - reserve;
    const trailing = tip - yardEnd > 26 ? Math.floor(lead * 0.35) : 0;
    const atFront = lead - trailing;
    const cols = Math.min(23, Math.max(6, Math.ceil(Math.sqrt(atFront * 2))));
    const depth = Math.min(
      Math.max(2, tip - yardEnd),
      (Math.ceil(atFront / cols) - 1) * 9,
    );
    const passage = Math.max(0, tip - depth - yardEnd);
    for (let i = 0; i < trailing; i++) {
      const y =
        yardEnd +
        (((passage * i) / trailing + clock * 19) % Math.max(1, passage));
      if (y >= 547 !== nearGates) continue;
      const half = Math.min(54, laneHalfWidth(y) * 0.82);
      cat(
        210 + (((i * 13) % 17) / 8 - 1) * half,
        y,
        i % 3 === 0 ? DARK_RED : RED,
        clamp(3.6 + y * 0.005, 3.6, 5.7),
        i * 0.77,
      );
    }
    const clash = Math.min(1.6, state.redRecentLoss * 0.02);
    for (let i = 0; i < atFront; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const spread = Math.max(1, Math.ceil(atFront / cols) - 1);
      const y = tip - (row / spread) * depth + ((i % 5) - 2) * 1.15;
      if (y >= 547 !== nearGates) continue;
      const half = laneHalfWidth(y) * 0.91;
      const x = 210 + (((col + 0.5) / cols) * 2 - 1) * half;
      cat(
        x,
        y,
        i % 4 === 0 ? DARK_RED : RED,
        clamp(3.7 + y * 0.006, 3.6, 6.1),
        i * 0.74,
      );
    }
  }

  function blueArmy(state, nearGates, triumph) {
    for (const q of state.squads) {
      const age = q.marchTime || 0;
      const fan = clamp(age / 0.21, 0, 1);
      const baseY =
        q.y +
        ((q.entryY ?? LEVEL.spawnY) - LEVEL.spawnY) * (1 - fan) -
        triumph * 28;
      if (baseY >= 547 !== nearGates) continue;
      const saveWidth = clamp((baseY - 245) / 287, 0, 1);
      const center = 210 + (q.x - 210) * (1 - fan + fan * saveWidth ** 1.7);
      const max = waveSize(q.count);
      const visible = 1 + Math.floor((max - 1) * fan);
      const cols = Math.ceil(Math.sqrt(max));
      const spacing = (q.mult === 999 ? 8.9 : 7.5) * fan;
      for (let i = 0; i < visible; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const y = baseY + row * spacing * 0.71;
        const x = clamp(
          center + ((q.slot || 0) * 6 + (col - (cols - 1) / 2) * spacing) * fan,
          210 - laneHalfWidth(y) + 2,
          210 + laneHalfWidth(y) - 2,
        );
        cat(
          x,
          y,
          q.mult === 999 && i % 3 === 0 ? BRIGHT_BLUE : BLUE,
          clamp(3.8 + y * 0.004, 3.8, 6.1),
          q.phase + i * 0.77,
        );
      }
    }

    const count = Math.min(340, Math.ceil(Math.sqrt(state.blueTotal) * 1.95));
    const front =
      state.front - Math.min(Math.max(0, state.front - 28), triumph * 67);
    const cols = Math.min(25, 8 + Math.floor(count / 13));
    const rows = Math.ceil(count / cols);
    const depth = Math.min(Math.max(18, 708 - front), rows * 9.5);
    const clash =
      triumph === 0 ? Math.min(1.6, state.blueRecentLoss * 0.03) : 0;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const y = front + 3 + (row * depth) / rows + ((i % 7) - 3) * 0.94;
      if (y >= 547 !== nearGates) continue;
      const half = laneHalfWidth(y) * (0.73 + triumph * 0.14);
      const x = 210 + (((col + 0.5) / cols) * 2 - 1) * half + (row % 2) * 2.3;
      cat(
        x,
        y,
        i % 5 === 0 ? DARK_BLUE : BLUE,
        clamp(4.1 + y * 0.004, 4.1, 6.25),
        i * 0.57,
      );
    }
  }

  return {
    setClock(value) {
      clock = value;
    },
    redArmy,
    blueArmy,
    projectile(shot) {
      cat(shot.x, shot.y, PROJECTILE, 6.0, shot.x * 0.75);
    },
  };
}
