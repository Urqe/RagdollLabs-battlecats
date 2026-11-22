import { TAU, clamp } from "./config.js";
import { laneHalfWidth, polygon } from "./terrain.js";
import { waveProfile, waveRelease, waveY } from "./motion.js";
import { breakthroughOffset, exchangeOffset, exchangeSeam, formationLag } from "./formation-dynamics.js";
import { gapShift, gapStrength } from "./formation.js";
import {
  FLAG_CAPTURE_TIME, mergeProgress, receivingY, smoothStep, victoryAdvance, victoryWaveVisibility,
} from "./army-movement.js";
import { collapsePose, retirementOpacity, rowsAt, slotCoverage } from "./army-continuity.js";
import {
  FIELD_LIMIT,
  RESERVE_LIMIT,
  RESERVE_GROUP,
  RESERVE_ROWS,
  armyScale,
  encounterBalance,
  encounterOffset,
  entryRepresentation,
  fieldColumn,
  fieldRow,
} from "./army-visual.js";

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

const TILE_WIDTH = 24;
const TILE_HEIGHT = 16;
const TILE_RESOLUTION = 2;
const TILE_WIDTH_PX = TILE_WIDTH * TILE_RESOLUTION;
const TILE_HEIGHT_PX = TILE_HEIGHT * TILE_RESOLUTION;
const TILE_POSES = 3;
const SPLIT_LIMIT = 12;
const tileX = (i, pose) => (i % 3 - 1) * 7.2 + (i < 3 ? -0.9 : 0.9) + (pose - 1) * 0.44;
const tileY = (i, pose) => (i < 3 ? -3.5 : 3.5) + ((i + pose) % 3 - 1) * 0.46;

function boundCatY(y, line, red, margin = 1.9) {
  return red ? clamp(y, 2, Math.max(2, line - margin))
    : clamp(y, Math.min(711, line + margin), 711);
}

function reserveAtlas(ownerDocument) {
  const atlas = ownerDocument?.createElement("canvas");
  if (!atlas) return null;
  atlas.width = TILE_WIDTH_PX * RESERVE_GROUP;
  atlas.height = TILE_HEIGHT_PX * TILE_POSES * 2;
  const ctx = atlas.getContext("2d");
  for (let team = 0; team < 2; team++) {
    for (let pose = 0; pose < TILE_POSES; pose++) {
      for (let size = 1; size <= RESERVE_GROUP; size++) {
        for (let i = 0; i < size; i++) {
          const x = (size - 0.5) * TILE_WIDTH + tileX(i, pose);
          const y = (team * TILE_POSES + pose + 0.5) * TILE_HEIGHT + tileY(i, pose);
          ctx.setTransform(1.46, 0, 0, 1.46, x * TILE_RESOLUTION, y * TILE_RESOLUTION);
          const tint = (team ? BLUE : RED) + Number((i + pose) % 4 === 0);
          paintCat(ctx, colors[tint], pose, false, false);
        }
      }
    }
  }
  return atlas;
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
  const stamps = reserveAtlas(ownerDocument);
  const redScale = {};
  const blueScale = {};
  const fieldJoins = new Uint16Array(FIELD_LIMIT);
  const reserveJoins = new Uint16Array(RESERVE_LIMIT);
  const traveller = {};
  let waveTails = [];
  let waveVisibility = 1;
  let receivingRear = 0;
  let receiverTime = -Infinity;
  let clock = 0;
  function cat(x, y, tint, size, phase, flatten = 0, stride = 1) {
    const detail = !flatten && size >= 4.25;
    const pose = detail ? Math.floor(clock * (stride > 1.5 ? 26 : 13) + phase) & 3 : 4;
    const bob = detail ? Math.sin(clock * 18 + phase * 1.6) * 0.58 * stride : 0;
    const span = size * 3.2;
    const height = span * (1 - flatten * 0.44);
    if (atlas) {
      ctx.drawImage(
        atlas,
        CELL * pose,
        CELL * tint,
        CELL,
        CELL,
        x - span / 2,
        y - height / 2 + bob,
        span,
        height,
      );
    } else {
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.scale(size / 5, height / 16);
      paintCat(ctx, colors[tint], pose, detail, tint === AIR_RED);
      ctx.restore();
    }
  }

  function drawReserveTile(x, y, count, team, pose, scale, flatten = 0) {
    const height = TILE_HEIGHT * scale * (1 - flatten * 0.42);
    ctx.drawImage(
      stamps,
      (count - 1) * TILE_WIDTH_PX,
      (team * TILE_POSES + pose) * TILE_HEIGHT_PX,
      TILE_WIDTH_PX,
      TILE_HEIGHT_PX,
      x - TILE_WIDTH * scale / 2,
      y - height / 2,
      TILE_WIDTH * scale,
      height,
    );
  }

  function drawReserve(state, start, end, living, extent, red, gap, strength, fallPose, formation, release) {
    if (!extent) return;
    const direction = red ? -1 : 1;
    const team = red ? 0 : 1;
    const span = red ? Math.abs(end - start) : Math.min(270, Math.abs(end - start));
    const pitch = span / RESERVE_ROWS;
    const battleLine = state.front - (red ? 0 : advance(state, 0));
    const depth = red ? 2.15 : 1.26;
    const cycle = Math.floor(clock * 7);
    let split = 0;
    let first = 0;

    for (let row = 0; first < extent && row < RESERVE_ROWS; row++) {
      const fraction = (row + 0.5) / RESERVE_ROWS;
      const march = red ? 0 : advance(state, 0.57 + fraction * 0.43);
      const lag = formationLag(formation, state.front, 0.74 + fraction * 0.26) * release;
      const distance = span * (1 - (1 - fraction) ** depth);
      const y = clamp(start + direction * distance + lag - march, 3, 710);
      const half = laneHalfWidth(y) - 8;
      // A column belongs to this band for its entire lifetime. The lane
      // changes its spacing, never its index or the next band's occupancy.
      const columns = 7 + 2 * Math.min(5, Math.floor(row / 3));
      const step = Math.min(19.4 * (0.83 + y * 0.00065), half / ((columns - 1) / 2));
      const size = clamp(step / 19.4, 0.42, 1.2);
      for (let col = 0; first < extent && col < columns; col++, first += RESERVE_GROUP) {
        const side = (col % 2 ? 1 : -1) * Math.ceil(col / 2);
        const track = row * 29 + col;
        const x = 210 + side * step + (row % 2 - 0.5) * 3
          + spacingNoise[track] * 2.5;
        const stride = Math.sin(clock * 6 + row * 0.71 + col * 0.46);
        const cy = boundCatY(y + direction * stride * Math.min(pitch * 0.23, 1.4),
          battleLine, red, 2 + TILE_HEIGHT * size / 2);
        const group = Math.min(Math.ceil(extent - first), RESERVE_GROUP);
        const pose = (cycle + row + col) % TILE_POSES;
        const exposed = strength && split < SPLIT_LIMIT && first < living
          && Math.abs(x - gap.x) < gap.radiusX + TILE_WIDTH / 2
          && Math.abs(cy - gap.y) < gap.radiusY * 2.15 + TILE_HEIGHT / 2;
        if (exposed) split++;
        let joining = false;
        if (!red && waveTails.length) {
          for (let i = 0; i < group; i++) joining ||= reserveJoins[first + i] !== 0;
        }
        const allLiving = !joining && !exposed && living >= first + group;
        const allFallen = living <= first && extent >= first + group;
        if (stamps && (allLiving || allFallen)) {
          const opacity = allFallen ? retirementOpacity(living, extent, first + group / 2, fallPose) : 1;
          if (allFallen) ctx.globalAlpha = opacity;
          drawReserveTile(x, allFallen ? boundCatY(cy + direction * fallPose * 4, battleLine, red) : cy,
            group, team, allFallen ? 0 : pose, size, allFallen ? 0.06 + fallPose * 0.94 : 0);
          if (allFallen) ctx.globalAlpha = 1;
          continue;
        }
        for (let i = 0; i < group; i++) {
          const slot = first + i;
          const coverage = slotCoverage(living, slot);
          const fallen = coverage === 0;
          const still = fallen ? 0 : pose;
          const px = x + tileX(i, still) * size;
          const py = cy + (fallen ? direction * fallPose * 3 : 0) + tileY(i, still) * size;
          const shifted = boundCatY(py + gapShift(px, py, gap, fallen ? 0 : strength, track + i),
            battleLine, red);
          const alpha = fallen ? retirementOpacity(living, extent, slot, fallPose) : coverage;
          const tint = red ? (fallen ? DARK_RED : RED) : (fallen ? DARK_BLUE : BLUE);
          const remaining = !red && coverage && reserveJoins[slot]
            ? joinSlot(state, reserveJoins[slot], px, shifted, 3.2 * size, alpha)
            : alpha;
          if (remaining > 0) {
            ctx.globalAlpha = remaining;
            cat(px, shifted, tint, 3.2 * size, i, fallen ? 0.06 + fallPose * 0.94 : 0);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawEntry(count, tip, clockAtCutoff, gap, strength) {
    const length = Math.min(113, tip - 12);
    if (length <= 0) return;
    const travel = (clockAtCutoff ?? clock) * 23;
    for (let i = 0; i < count; i++) {
      const y = (travel + i * 18) % (length + 12) - 8;
      const x = 210 + (((i % 5) - 2) * 0.29) * laneHalfWidth(y)
        + spacingNoise[i + 455] * 7;
      const alpha = clamp(Math.min(y + 6, length - y) / 8, 0, 1);
      ctx.globalAlpha = alpha;
      cat(x, boundCatY(y + gapShift(x, y, gap, strength, i), tip + 6, true), DARK_RED, 3.6, i);
    }
    if (count) ctx.globalAlpha = 1;
  }

  function contactSeam(front, x, contact, gap, strength) {
    let shift = 0;
    for (const exchange of contact.exchanges) shift += exchangeSeam(exchange, clock, x);
    if (strength) {
      const advance = Math.max(0, contact.formation?.drive ?? 0);
      const lane = Math.max(0, 1 - Math.abs(x - gap.x) / gap.radiusX);
      shift -= 7 * strength * advance * lane;
    }
    return front + clamp(shift, -Math.min(8, Math.max(0, front - 18)), 8);
  }

  function army(state, scale, red, front, contact, gap, flights) {
    const total = red ? state.redTotal : state.blueTotal;
    const opposing = red ? state.blueTotal : state.redTotal;
    const presentation = red ? contact.redArmy : contact.blueArmy;
    const initialized = state.mode !== "end" && presentation?.population === total;
    const { field, reserve } = initialized ? presentation : armyScale(total, scale);
    const celebrating = !red && (state.mode === "victory" || state.victoryElapsed > 0);
    const fieldExtent = initialized && !celebrating ? presentation.fieldExtent : field;
    const reserveExtent = initialized && !celebrating ? presentation.reserveExtent : reserve;
    const rows = initialized ? presentation.rows : rowsAt(field);
    const recoil = initialized ? presentation.recoil : 0;
    const release = 1 - smoothStep(state.victoryElapsed / 0.38);
    const compression = initialized ? presentation.compression * release : 0;
    const fallPose = initialized ? collapsePose(presentation.collapseAge) : 0;
    if (!fieldExtent && !reserveExtent) return;
    const side = red ? -1 : 1;
    const tip = front + side * 6;
    const end = red ? 3 : 702;
    const reach = Math.abs(end - tip);
    const marching = celebrating && state.victoryElapsed < FLAG_CAPTURE_TIME + 0.4;
    const pressure = red ? contact.pressure : -contact.pressure;
    const redPressure = (red ? total : opposing) * state.level.combat.redPressurePerCat;
    const balance = red ? encounterBalance(redPressure, opposing)
      : encounterBalance(total, redPressure);
    const formation = contact.formation;
    const packed = (formation?.compression ?? 0) * release;
    const step = Math.min(
      (reach * 0.59) / Math.max(1, rows),
      8.9 - packed * (red ? 0.65 : 2.15) - compression * 0.76,
    );
    const gapAmount = gapStrength(clock - gap?.at);
    const sinceCutoff = clock - (contact.cutoffAt ?? clock);
    const entry = red
      ? entryRepresentation(reserve, state.redEntryRate || contact.entryRate || 0, sinceCutoff)
      : 0;
    const rear = tip + side * Math.min(
      reach * 0.68, rows * step + 8,
    );
    if (!red) {
      const receiverLag = formationLag(formation, front, reserve > 0 ? 0.79 : Math.min(0.74, rows / 22))
        * (reserve > 0 ? 1 : 0.72) * release;
      const rearSpread = Math.min(63, reserve * 0.29);
      const target = (reserve > 0 ? rear + rearSpread : tip + rows * step)
        + receiverLag - advance(state, 0.63);
      updateReceiver(target, state);
    }
    drawReserve(state, rear, end, reserve - entry, reserveExtent - entry,
      red, gap, red ? gapAmount : 0, fallPose, formation, release);
    if (entry) drawEntry(entry, tip, contact.cutoffAt, gap, gapAmount);

    const engaged = total > 0 && opposing > 0 && state.mode === "playing";
    const shock = Math.max(0, 1 - contact.clashAge / 0.15) ** 2;
    const flush = Math.max(0, 1 - (clock - contact.surgeAt) / 0.68);
    const stress = red ? contact.red : contact.blue;
    const leadingY = front - (red ? 0 : advance(state, 0));
    const drive = formation?.drive ?? 0;
    const gait = marching ? 2.1
      : engaged ? 0.48 + Math.abs(drive) * 0.82 : 0.82;
    let opacity = 1;
    let lastRow = -1;
    let baseline, lane, spacing, anchor, stagger;
    for (let i = Math.ceil(fieldExtent) - 1; i >= 0; i--) {
      const coverage = slotCoverage(field, i);
      const fallen = coverage === 0;
      const row = fieldRow(i);
      const rank = fieldColumn(i);
      if (row !== lastRow) {
        const depth = Math.min(1, row / Math.max(6, rows));
        const travel = red ? 0 : advance(state, depth * 0.52);
        const lag = formationLag(formation, front, Math.min(0.74, row / 22)) * 0.72 * release;
        const cheerTime = state.victoryElapsed - FLAG_CAPTURE_TIME - depth * 0.36;
        const cheer = Math.sin(Math.PI * clamp(cheerTime / 0.55, 0, 1)) * 7;
        baseline = tip + side * row * step + lag - travel - cheer;
        lane = laneHalfWidth(baseline) - 6;
        spacing = Math.min(12.5, lane / Math.max(2, Math.min(7, 2 + row)));
        anchor = red ? 0 : (contact.blueAnchor - 210) * clamp((baseline - 275) / 320, 0, 0.32);
        stagger = row ? (row % 2 - 0.5) * Math.min(3, spacing * 0.4) : 0;
        lastRow = row;
      }
      const offset = rank * spacing + anchor + stagger +
        (row ? spacingNoise[i + 19] * Math.min(3.8, spacing * 0.44) : 0);
      const x = 210 + clamp(offset, -lane, lane);
      const local = 1 - clamp(Math.abs(x - contact.clashX) / 40, 0, 1);
      const bump = engaged && !fallen
        ? encounterOffset(clock, i, row, red, balance, pressure,
          local * shock * stress * 2.7 - flush * pressure * 1.3 + recoil * 5) * 0.72
        : 0;
      const cadence = (row || marching) && !fallen
        ? Math.sin(clock * (marching ? 17 : 11) + rank * 0.6 - row * 0.59)
          * Math.min(marching ? 1.7 : gait, step * 0.24) : 0;
      const opening = engaged && !fallen
        ? breakthroughOffset(clock, x, row, formation?.opening ?? 0, red) : 0;
      let displacement = 0;
      const seam = engaged ? contactSeam(leadingY, x, contact, gap, gapAmount) : leadingY;
      if (engaged && row < 4) {
        for (const exchange of contact.exchanges)
          displacement += exchangeOffset(exchange, clock, x, row, red);
        if (!red && gapAmount && drive > 0) {
          const lane = Math.max(0, 1 - Math.abs(x - gap.x) / gap.radiusX);
          displacement -= 9 * drive * gapAmount * lane * (1 - row / 4);
        }
      }
      const y = baseline + opening + displacement - side * bump + cadence
        + spacingNoise[i] * Math.min(1.2, step * 0.2);
      const displaced = fallen ? y + side * fallPose * (3 + recoil * 7)
        : y + gapShift(x, y, gap, red ? gapAmount : 0, i);
      const within = boundCatY(displaced, seam, red, celebrating ? -3 : engaged ? 6.8 : 1.9);
      const size = clamp(4.35 + within * 0.0027, 4.35, 6.12);
      let alpha = fallen ? retirementOpacity(field, fieldExtent, i, fallPose) : coverage;
      if (!red && coverage && fieldJoins[i]) {
        alpha = joinSlot(state, fieldJoins[i], x, within, size, alpha);
        opacity = ctx.globalAlpha;
      }
      const flight = flights?.[i];
      if (flight && coverage && alpha > 0 && clock >= flight.at) {
        // Substitute the living slot with its animated pose for this draw.
        // Support reactions lift off at the strike and reunite with the moving rank.
        const blend = flight.fromImpact ? smoothStep((clock - flight.at) / flight.flight) : 1;
        flight.drawX = flight.x + (x - flight.x) * blend;
        flight.drawY = flight.y + (within - flight.y) * blend;
        flight.size = size;
        flight.coverage = alpha;
        flight.visible = true;
        continue;
      }
      if (alpha > 0) {
        if (alpha !== opacity) ctx.globalAlpha = opacity = alpha;
        cat(x, within, (red ? RED : BLUE) + Number(fallen || i % 5 === 4),
          size, i * 0.71, fallen ? 0.06 + fallPose * 0.94 : 0, gait);
      }
    }
    if (opacity !== 1) ctx.globalAlpha = 1;
  }

  function redArmy(state, contact, gap, flights) {
    if (state.mode !== "victory") army(state, redScale, true, state.front, contact, gap, flights);
  }

  function updateReceiver(target, state) {
    if (state.mode === "menu" || clock < receiverTime || receiverTime === -Infinity) {
      receivingRear = target;
    } else {
      const dt = clock - receiverTime;
      receivingRear += clamp(target - receivingRear, -126 * dt, 116 * dt);
    }
    receiverTime = clock;
  }

  function advance(state, depth) {
    return state.victoryElapsed
      ? victoryAdvance(state.front, state.level.objective.flagY, state.victoryElapsed, depth)
      : 0;
  }

  function travelPose(q, i, age, state) {
    const profile = waveProfile(q.mult);
    const entryY = q.entryY ?? state.level.combat.spawnY;
    const run = age - waveRelease(profile, i);
    if (run < 0) return false;
    const rawY = waveY(entryY, run, state.level);
    const push = clamp(run / profile.spread, 0, 1);
    const spread = push * (2 - push);
    const sway = spacingNoise[(i + Math.floor(q.phase * 31)) % spacingNoise.length];
    const rank = Math.floor(i / profile.cols);
    const stride = Math.sin(run * 13 + i * 1.7);
    const front = state.front - advance(state, 0);
    const y = boundCatY(receivingY(rawY, receivingRear, front, entryY)
      + (sway * 3 + stride * 1.4) * spread, front, false);
    const route = clamp((y - 242) / 270, 0, 1);
    const offset = (q.slot || 0) * profile.laneOffset;
    const col = i % profile.cols;
    const local = (col - (profile.cols - 1) / 2) * profile.spacing + sway * 6
      + (profile.cols > 2 ? (rank % 2 - 0.5) * profile.spacing * 0.64 : 0);
    const center = 210 + (q.x - 210 + offset * spread) * (1 - spread + spread * route ** 1.38);
    const half = laneHalfWidth(y) - 2;
    traveller.x = clamp(center + local * spread * (0.66 + route * 0.34), 210 - half, 210 + half);
    traveller.y = y;
    traveller.tint = q.mult === 999 && (i % 4 === 0 || run < 0.09) ? BRIGHT_BLUE : BLUE;
    traveller.phase = q.phase + i * 0.91;
    traveller.size = clamp(3.95 + y * 0.0039, 3.8, 6.15);
    return true;
  }

  function tailVisibility(q, index) {
    if (q.at === undefined) return waveVisibility;
    const profile = waveProfile(q.mult);
    const clearGate = q.born + waveRelease(profile, index) + 0.29;
    const fadeAt = Math.max(q.at + 0.14, clearGate);
    return waveVisibility * (1 - smoothStep((clock - fadeAt) / 0.34));
  }

  function joinSlot(state, owner, x, y, size, coverage) {
    const q = waveTails[(owner >> 5) - 1];
    const member = owner & 31;
    const starts = q.join.started;
    if (!travelPose(q, member, clock - q.born, state)) return 0;
    const entryY = q.entryY ?? state.level.combat.spawnY;
    if (starts[member] < 0) {
      const clearOfGate = entryY - 46;
      if (traveller.y > clearOfGate && clock - q.at < 0.26) return 0;
      starts[member] = clock;
      if (traveller.y > clearOfGate || y > clearOfGate ||
          Math.hypot(x - traveller.x, y - traveller.y) > 100)
        q.join.remote |= 1 << member;
    }
    const blend = mergeProgress(clock - starts[member]);
    q.painted |= 1 << member;
    if (blend === 1) return coverage;

    const moving = tailVisibility(q, member);
    // Long reserve moves and tiles behind a different gate use an opacity
    // handoff. A visible cat never traverses the intervening scenery.
    if (q.join.remote & (1 << member)) {
      ctx.globalAlpha = moving * (1 - blend);
      cat(traveller.x, traveller.y, traveller.tint, traveller.size, traveller.phase);
      return coverage * blend;
    }
    const py = traveller.y + (y - traveller.y) * blend;
    const lane = laneHalfWidth(py) - 4;
    const px = clamp(traveller.x + (x - traveller.x) * blend, 210 - lane, 210 + lane);
    ctx.globalAlpha = moving * (1 - blend) + coverage * blend;
    cat(px, py, traveller.tint, traveller.size + (size - traveller.size) * blend, traveller.phase);
    return 0;
  }

  function blueWave(q, age, state) {
    const limit = Math.min(waveProfile(q.mult).count, q.count);
    let alpha = 1;
    for (let i = 0; i < limit; i++) {
      if (!travelPose(q, i, age, state)) break;
      if (q.painted & (1 << i)) continue;
      const began = q.join?.started?.[i] ?? -1;
      const blend = began < 0 ? 0 : mergeProgress(clock - began);
      const opacity = tailVisibility(q, i) * (1 - blend);
      if (opacity <= 0) continue;
      if (opacity !== alpha) ctx.globalAlpha = alpha = opacity;
      cat(traveller.x, traveller.y, traveller.tint, traveller.size, traveller.phase);
    }
    if (alpha !== 1) ctx.globalAlpha = 1;
  }

  function blueArmy(state, _surge, contact, tails, gap, flights) {
    waveTails = state.mode === "end" ? [] : tails;
    waveVisibility = victoryWaveVisibility(state.victoryElapsed, state.level.combat.victoryDuration);
    fieldJoins.fill(0);
    reserveJoins.fill(0);
    for (let i = 0; i < waveTails.length; i++) {
      const q = waveTails[i];
      q.painted = 0;
      const join = q.join;
      if (!join) continue;
      const owner = (i + 1) << 5;
      for (let j = 0; j < join.fieldCount; j++) fieldJoins[join.field + j] = owner | j;
      for (let j = 0; j < join.reserveCount; j++)
        reserveJoins[join.reserve + j] = owner | (join.fieldCount + j);
    }
    if (!state.blueTotal) updateReceiver(state.front + 13 - advance(state, 0), state);
    army(state, blueScale, false, state.front, contact, gap, flights);
    if (state.mode === "end") return;

    // Already launched ranks continue advancing during the celebration.
    for (const q of state.squads) blueWave(q, (q.marchTime || 0) + state.victoryElapsed, state);
    for (const q of tails) blueWave(q, clock - q.born, state);
  }

  function airborne(cats) {
    for (const flight of cats) {
      if (!flight.visible) continue;
      const baseSize = flight.size ?? clamp(4.35 + flight.y * 0.0027, 4.35, 6.12);
      const size = baseSize * (1 + clamp(flight.rise / 28, 0, 1) * 0.28);
      const x = (flight.drawX ?? flight.x) + flight.dx;
      const y = (flight.drawY ?? flight.y) + flight.dy;
      ctx.save();
      ctx.globalAlpha = flight.alpha * (flight.coverage ?? 1);
      if (flight.rise > 6) ellipse(ctx, x, y + flight.rise + 3, 3.5, 1.4, "#20262c55");
      ctx.translate(x, y);
      ctx.rotate(flight.angle);
      const team = flight.red ? RED : BLUE;
      const tint = flight.defeated ? team + 1
        : flight.rise > 4 ? (flight.red ? AIR_RED : BRIGHT_BLUE) : team;
      cat(0, 0, tint, size, (flight.slot ?? 0) * 0.71, flight.squash);
      ctx.restore();
    }
  }

  function fallen(falls) {
    for (const fall of falls) {
      if (fall.at > clock) continue;
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
    airborne,
    crew(x, y, pose) {
      cat(x, y, BLUE, 6, pose);
    },
    projectile(shot) {
      cat(shot.x, shot.y, PROJECTILE, 6.0, shot.x * 0.75);
    },
  };
}
