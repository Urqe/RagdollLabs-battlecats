import { TAU, clamp } from "./config.js";
import { laneHalfWidth, polygon } from "./terrain.js";
import { waveProfile, waveRelease, waveY } from "./motion.js";
import { gapShift, gapStrength } from "./formation.js";

const colors = [
  "#df544b",
  "#b93843",
  "#379aff",
  "#1d72d3",
  "#83d9ff",
  "#a9eaff",
  "#ff886f",
];
const RED = 0;
const DARK_RED = 1;
const BLUE = 2;
const DARK_BLUE = 3;
const BRIGHT_BLUE = 4;
const PROJECTILE = 5;
const AIR_RED = 6;
const CELL = 48;
const spacingNoise = new Float32Array(1232);
let seed = 1729;
for (let i = 0; i < spacingNoise.length; i++) {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  spacingNoise[i] = seed / 2 ** 32 - 0.5;
}

const YARD_COLS = 42;
const YARD_ROWS = 24;
const yardPriority = new Uint16Array(YARD_COLS * YARD_ROWS);
{
  const yardSlots = Array.from(yardPriority.keys(), (i) => {
    const row = Math.floor(i / YARD_COLS);
    const col = i % YARD_COLS;
    return {
      i,
      score:
        spacingNoise[i] * 0.58 +
        Math.sin(col * 0.73 + row * 0.4) * 0.31 +
        Math.cos(row * 1.1 - col * 0.24) * 0.2,
    };
  });
  yardSlots.sort((a, b) => a.score - b.score);
  for (let i = 0; i < yardSlots.length; i++) yardPriority[yardSlots[i].i] = i;
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function paintCat(ctx, color, frame, detail, airborne) {
  if (airborne) {
    const flail = Math.sin((frame * TAU) / 4);
    ellipse(ctx, 0, 0.6, 4.1, 5.1, "#853e42");
    ellipse(ctx, -4, 1.2 + flail * 1.5, 1.9, 1.15, "#ffb080");
    ellipse(ctx, 4, 1.2 - flail * 1.5, 1.9, 1.15, "#ffb080");
  } else {
    ellipse(ctx, 0.7, 3.5, 4.2, 1.8, "#20262c55");
  }
  if (detail) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.quadraticCurveTo(5, 3, 5.5, 0.2);
    ctx.stroke();
    const stride = Math.sin((frame * TAU) / 4) * 1.45;
    ellipse(ctx, -1.65, 4.05 + stride, 1.05, 1.7, "#263345");
    ellipse(ctx, 1.65, 4.05 - stride, 1.05, 1.7, "#263345");
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
        paintCat(sprites, colors[i], pose, pose !== 4, i === AIR_RED);
      }
    }
  }
  let clock = 0;
  function cat(x, y, tint, size, phase) {
    const detail = size >= 4.25;
    const pose = detail ? Math.floor(clock * 13 + phase) & 3 : 4;
    const bob = detail ? Math.sin(clock * 18 + phase * 1.6) * 0.58 : 0;
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
      paintCat(ctx, colors[tint], pose, detail, tint === AIR_RED);
      ctx.restore();
    }
  }

  function drawYard(state, tip, reserve, cutoffAt, gap, strength) {
    // Occupancy hides stable slots. Losses open holes in the ranks without
    // relocating all survivors every time the representative count changes.
    const rows = Math.min(YARD_ROWS, Math.max(1, Math.ceil((tip - 8) / 8)));
    const threshold = reserve * (1 + 0.35 * (1 - rows / YARD_ROWS));
    if (!reserve && !state.redEntryRate) return;
    const distance = (cutoffAt ?? clock) * 9;
    const drift = distance % 8;
    const flowedRows = Math.floor(distance / 8) % YARD_ROWS;
    for (let row = 0; row < rows; row++) {
      const y = 1 + row * 8 + drift;
      if (y >= tip - 5) break;
      const half = laneHalfWidth(y) - 4;
      const origin = (row + YARD_ROWS - flowedRows) % YARD_ROWS;
      for (let col = 0; col < YARD_COLS; col++) {
        const i = origin * YARD_COLS + col;
        if (yardPriority[i] >= threshold) continue;
        const x =
          210 + (((col + 0.5 + (row % 2) * 0.22) / YARD_COLS) * 2 - 1) * half;
        const px = x + spacingNoise[i] * 4;
        const py = y + spacingNoise[(i + 271) % spacingNoise.length] * 4;
        cat(
          px,
          Math.min(tip, py + gapShift(px, py, gap, strength, i)),
          i % 5 === 0 ? DARK_RED : RED,
          3.48 + y * 0.0047,
          i * 0.71,
        );
      }
    }
    const files = Math.min(12, Math.ceil(state.redEntryRate / 240));
    for (let file = 0; file < files; file++) {
      const track = ((file + 0.5) / files) * 2 - 1;
      for (let mark = 0; mark < 6; mark++) {
        const y = ((clock * 21 + file * 8 + mark * 17) % 102) - 12;
        if (y >= Math.min(rows * 8, tip - 7)) continue;
        const x = 210 + track * laneHalfWidth(y) * 0.95;
        cat(
          x,
          Math.min(tip, y + gapShift(x, y, gap, strength, file + mark)),
          DARK_RED,
          3.55,
          file + mark,
        );
      }
    }
  }

  function redArmy(state, nearGates, contact, gap) {
    const count = redFormationSize(state.redTotal);
    if (!count) return;
    const tip = state.front - 3;
    const yardEnd = Math.min(191, tip - 12);
    const reserve = Math.floor(count * 0.76 * clamp(count / 105, 0, 1));
    const strength = gapStrength(clock - gap?.at);
    if (!nearGates) drawYard(state, tip, reserve, contact.cutoffAt, gap, strength);

    const lead = count - reserve;
    const trailing = tip - yardEnd > 26 ? Math.floor(lead * 0.35) : 0;
    const atFront = lead - trailing;
    const cols = Math.min(23, Math.max(3, Math.ceil(Math.sqrt(atFront * 2))));
    const rows = Math.ceil(atFront / cols);
    const losing = Math.max(0, -contact.pressure);
    const pushing = Math.max(0, contact.pressure);
    const depth = Math.min(
      Math.max(4, tip - yardEnd),
      (rows - 1) * (10.3 - losing * 2.6 - contact.hold * 0.65),
    );
    const passage = Math.max(0, tip - depth - yardEnd);
    for (let i = 0; i < trailing; i++) {
      const y =
        yardEnd +
        (((passage * i) / trailing + clock * 19) % Math.max(1, passage));
      const half = Math.min(54, laneHalfWidth(y) * 0.82);
      const x = 210 + (((i * 13) % 17) / 8 - 1) * half;
      const displaced = Math.min(tip, y + gapShift(x, y, gap, strength, i));
      if (displaced >= 547 !== nearGates) continue;
      cat(
        x,
        displaced,
        i % 3 === 0 ? DARK_RED : RED,
        clamp(3.6 + y * 0.005, 3.6, 5.7),
        i * 0.77,
      );
    }

    for (let i = 0; i < atFront; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const across = ((col + 0.5) / cols) * 2 - 1;
      const edge = nearContact(i, row, across, contact, true);
      const y =
        tip -
        (row / Math.max(1, rows - 1)) * depth +
        edge +
        spacingNoise[i] * 3;
      const half =
        laneHalfWidth(y) * (0.8 + pushing * 0.1) * Math.min(1, atFront / 12);
      const x = 210 + across * half + spacingNoise[i + 17] * 4;
      const displaced = Math.min(tip + 2, y + gapShift(x, y, gap, strength, i));
      if (displaced >= 547 !== nearGates) continue;
      cat(
        x,
        displaced,
        i % 4 === 0 ? DARK_RED : RED,
        clamp(3.7 + y * 0.006, 3.6, 6.1),
        i * 0.74,
      );
    }
  }

  function nearContact(i, row, across, contact, red) {
    if (row > 2 || clock - contact.foughtAt > 0.32 || contact.foughtAt < 0)
      return 0;
    const press = red ? contact.pressure : -contact.pressure;
    const stress = red ? contact.red : contact.blue;
    const rhythm = Math.sin(clock * 15 + i * 1.47 + (red ? 0 : 2));
    const seam = Math.sin(across * 7 + clock * 2) * 1.6;
    const attack = Math.max(0, rhythm) * (2.4 + Math.max(0, press) * 3.8);
    const guard = Math.max(0, -rhythm) * (1.7 + Math.max(0, -press) * 4.7);
    const reach = Math.abs(contact.clashX - 210 - across * 45) / 41;
    const touch = 1 - clamp(reach, 0, 1);
    const bump = Math.max(0, 1 - contact.clashAge / 0.16) ** 2;
    const recoil = touch * bump * (1.2 + stress * 5 + Math.max(0, -press) * 4);
    const surge = Math.max(0, 1 - (clock - contact.surgeAt) / 0.68);
    const advance = (red ? 1 : -1) * (attack - guard - recoil + press * surge * 11);
    return (seam + advance) * (1 - row * 0.32);
  }

  function blueWave(q, age, state, nearGates, triumph) {
    const profile = waveProfile(q.mult);
    const entryY = q.entryY ?? state.level.combat.spawnY;
    const contactY = Math.min(state.front + 13, entryY - 27);
    const limit = Math.min(profile.count, q.count);
    let alpha = 1;
    for (let i = 0; i < limit; i++) {
      const run = age - waveRelease(profile, i);
      if (run < 0) break;
      const marchY = waveY(entryY, run, state.level);
      if (marchY <= contactY - 15) continue;
      const push = clamp(run / profile.spread, 0, 1);
      const spread = push * (2 - push);
      const sway =
        spacingNoise[(i + Math.floor(q.phase * 31)) % spacingNoise.length];
      // Keep each lane aligned at the opening, then fan the large waves as
      // independent ranks so several volleys read as a continuous column.
      const rank = Math.floor(i / profile.cols);
      const stride = Math.sin(run * 13 + i * 1.7);
      const y = marchY - triumph * 28 + (sway * 3 + stride * 1.4) * spread;
      if (y >= 547 !== nearGates) continue;
      const route = clamp((y - 242) / 270, 0, 1);
      const offset = (q.slot || 0) * profile.laneOffset;
      const col = i % profile.cols;
      const local = (col - (profile.cols - 1) / 2) * profile.spacing + sway * 6
        + (profile.cols > 2 ? (rank % 2 - 0.5) * profile.spacing * 0.64 : 0);
      const center =
        210 +
        (q.x - 210 + offset * spread) * (1 - spread + spread * route ** 1.38);
      const half = laneHalfWidth(y) - 2;
      const x = clamp(
        center + local * spread * (0.66 + route * 0.34),
        210 - half,
        210 + half,
      );
      const opacity = clamp((marchY - contactY + 15) / 15, 0, 1);
      if (opacity !== alpha) ctx.globalAlpha = alpha = opacity;
      cat(
        x,
        y,
        q.mult === 999 && (i % 4 === 0 || run < 0.09) ? BRIGHT_BLUE : BLUE,
        clamp(3.95 + y * 0.0039, 3.8, 6.15),
        q.phase + i * 0.91,
      );
    }
    if (alpha !== 1) ctx.globalAlpha = 1;
  }

  function blueArmy(state, nearGates, triumph, contact, tails) {
    for (const q of state.squads)
      blueWave(q, q.marchTime || 0, state, nearGates, triumph);
    if (!triumph) {
      for (const q of tails) blueWave(q, state.t - q.born, state, nearGates, 0);
    }

    const displayed = contact.blueStrength ?? state.blueTotal;
    const count = Math.min(340, Math.ceil(Math.sqrt(displayed) * 1.95));
    const front =
      state.front - Math.min(Math.max(0, state.front - 28), triumph * 67);
    const cols = Math.min(26, 8 + Math.floor(count / 13));
    const rows = Math.ceil(count / cols);
    const losing = Math.max(0, contact.pressure) * (1 - triumph);
    const advancing = Math.max(0, -contact.pressure);
    const occupancy = 0.4 + 0.6 * Math.min(1, Math.sqrt(count / 140));
    const depth = Math.min(
      Math.max(18, 708 - front),
      rows * (9.5 - losing * 2.6 - contact.hold * 0.95),
    );
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const across = ((col + 0.5) / cols) * 2 - 1;
      const edge = triumph ? 0 : nearContact(i, row, across, contact, false);
      const cadence = Math.sin(clock * 12 + col * 0.94 - row * 0.77);
      const y = front + 4 + (row * depth) / rows + spacingNoise[i] * 4
        + edge + cadence * Math.min(1.6, row * 0.45);
      if (y >= 547 !== nearGates) continue;
      const lane = laneHalfWidth(y);
      const half =
        lane *
        (0.72 + advancing * 0.16 - losing * 0.13 + triumph * 0.05) *
        occupancy;
      const trail = clamp((y - 245) / 290, 0, 1) ** 1.4;
      const center =
        210 +
        clamp((contact.blueAnchor - 210) * trail, half - lane, lane - half);
      const x =
        center + across * half + spacingNoise[i + 11] * 5 + (row % 2) * 2.3;
      cat(
        x,
        y,
        i % 5 === 0 ? DARK_BLUE : BLUE,
        clamp(4.1 + y * 0.004, 4.1, 6.25),
        i * 0.63,
      );
    }
  }

  function fallen(falls) {
    for (const fall of falls) {
      const age = clamp((clock - fall.at) / 0.38, 0, 1);
      ctx.save();
      const drift = fall.x < 210 ? -1 : 1;
      const lift = 24 * age * (1 - age);
      ctx.translate(
        fall.x + drift * age * 8,
        fall.y + (fall.red ? -1 : 1) * age * 13 - lift,
      );
      ctx.rotate(drift * age * 2.8);
      ctx.globalAlpha = (1 - age) * 0.76;
      cat(0, 0, fall.red ? DARK_RED : DARK_BLUE, 4.4, 0);
      ctx.restore();
    }
  }

  return {
    setClock(value) {
      clock = value;
    },
    redArmy,
    blueArmy,
    fallen,
    crew(x, y, pose) {
      cat(x, y, BLUE, 6, pose);
    },
    scattered(x, y, size, pose) {
      cat(x, y, AIR_RED, size, pose);
    },
    projectile(shot) {
      cat(shot.x, shot.y, PROJECTILE, 6.0, shot.x * 0.75);
    },
  };
}
