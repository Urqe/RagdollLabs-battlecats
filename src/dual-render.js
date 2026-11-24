import { FLAG_CAPTURE_TIME, FLAG_RAISE_TIME, smoothStep } from "./army-movement.js";
import { barrierIndex, barrierStatus } from "./barricades.js";
import { clamp, H, TAU, W } from "./config.js";
import { crossings } from "./dual-battlefield.js";
import { LEVEL_FOUR } from "./levels.js";
import { CROSSINGS } from "./dual-front.js";
import { createFigures } from "./figures.js";
import { drawCannon } from "./render.js";
import { polygon } from "./terrain.js";

const blue = "#79d9ff";
const red = "#ff9888";
const amber = "#ffca77";
const shield = [[6, "#734b2e"], [4.7, "#edb861"], [3.4, "#2b7296"], [1.4, "#f9d786"]];
const countFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function text(ctx, value, x, y, size, color = "#f9eacb") {
  ctx.font = `800 ${size}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

// Scenery uses the same 420 × 760 space as the combat, with no projection.
const southBank = 407;

function passage(id, y) {
  if (id === "left") {
    return { x: 112 - 32 * smoothStep(1 - Math.abs(y - 309) / 132),
      width: 62 + 87 * smoothStep((Math.abs(y - 309) - 22) / 103) };
  }
  return { x: 308 + 28 * smoothStep(1 - Math.abs(y - 344) / 151),
    width: 85 + 68 * smoothStep((Math.abs(y - 344) - 31) / 90) };
}

function capturePoint(id, objective) {
  return { x: crossings[id].center, y: objective.flagY + 24 };
}

function tent(ctx, x, y, width, height, light) {
  polygon(ctx, "#30332b88", [x - 4, y + 5, x + width + 8, y + 4,
    x + width + 17, y - 9, x + 8, y - 11]);
  polygon(ctx, "#733f37", [x, y, x + 15, y - height, x + width - 3, y - height,
    x + width + 8, y - 8, x + width, y]);
  polygon(ctx, light, [x, y, x + 15, y - height, x + width - 3, y - height, x + width - 16, y]);
  polygon(ctx, "#502d2d", [x + 4, y, x + 15, y - height + 4, x + 21, y]);
  rect(ctx, "#d9ab75", x - 2, y, 4, 3);
  rect(ctx, "#d9ab75", x + width, y, 4, 3);
}

function redCamp(ctx, id, objective) {
  const { x, y } = capturePoint(id, objective);
  tent(ctx, x - 72, y + 47, 42, 32, "#b35846");
  tent(ctx, x + 40, y + 70, 30, 24, "#a84d40");
  for (const offset of [0, 11, 18]) {
    rect(ctx, "#473c2c", x + 40 + offset, y + 15 + offset % 7, 13, 11);
    rect(ctx, "#97764e", x + 41 + offset, y + 15 + offset % 7, 10, 3);
  }
  rect(ctx, "#524733", x - 7, y - 2, 14, 6);
  rect(ctx, "#ac956b", x - 5, y - 3, 10, 4);
}

function bridge(ctx, center) {
  const width = 67;
  const edge = center - width / 2;
  const top = 271;
  const bottom = 353;
  rect(ctx, "#18383ec0", edge + 7, top, width + 4, bottom - top + 5);
  rect(ctx, "#604838", edge, top, width, bottom - top);
  for (let y = top + 3; y < bottom - 2; y += 10) {
    rect(ctx, y % 3 ? "#a78763" : "#967452", edge + 5, y, width - 10, 8);
    rect(ctx, "#c5a17b", edge + 8, y, width - 16, 1);
  }
  for (const x of [edge, edge + width - 5]) {
    rect(ctx, "#4e3830", x, top, 5, bottom - top);
    rect(ctx, "#b09371", x + 1, top + 2, 2, bottom - top - 4);
    for (let y = top + 4; y < bottom; y += 26) {
      rect(ctx, "#463632", x - 2, y - 2, 9, 9);
      rect(ctx, "#d0b48a", x - 1, y - 3, 7, 4);
    }
  }
  for (const y of [top, bottom - 4]) rect(ctx, "#786d5a", edge + 5, y, width - 10, 4);
}

function wall(ctx, x, y, width, height) {
  rect(ctx, "#263b49", x, y + 6, width, height);
  rect(ctx, "#506672", x, y, width, height);
  for (let i = 0; i < width - 10; i += 20) {
    rect(ctx, "#8f9f9e", x + i, y - 5, 12, 9);
    rect(ctx, "#394f5e", x + i + 4, y + 13, 12, 2);
  }
}

function castle(ctx, wallY) {
  // Both roads open onto one apron at the breach line; the aiming gates
  // and cannon share the paved courtyard immediately behind the wall.
  rect(ctx, "#3d545b", 10, wallY, W - 20, H - wallY);
  rect(ctx, "#586962", 22, wallY + 12, W - 44, H - wallY - 12);
  for (let y = wallY + 20; y < 705; y += 17) {
    for (let x = 24 + (y % 2) * 14; x < 380; x += 29)
      rect(ctx, "#76817960", x, y, 25, 14);
  }
  wall(ctx, 10, wallY, W - 20, 19);
  wall(ctx, 181, wallY - 55, 58, 74);
  ctx.fillStyle = "#253946";
  ctx.beginPath();
  ctx.arc(210, wallY - 12, 17, Math.PI, 0);
  ctx.fill();
  rect(ctx, "#253946", 193, wallY - 12, 34, 30);
  rect(ctx, "#82644d", 197, wallY - 10, 26, 27);
  for (let x = 202; x < 223; x += 6) rect(ctx, "#5c493d", x, wallY - 9, 2, 26);
  for (const x of [155, 237]) {
    wall(ctx, x, wallY - 30, 28, 49);
    polygon(ctx, "#2777b4", [x + 7, wallY - 13, x + 21, wallY - 13,
      x + 21, wallY + 11, x + 14, wallY + 8, x + 7, wallY + 11]);
    rect(ctx, "#afe1e9", x + 12, wallY - 6, 4, 8);
  }
  for (const x of [10, W - 22]) rect(ctx, "#405969", x, wallY + 19, 12, H - wallY - 19);
  rect(ctx, "#354955", 20, 656, W - 40, 26);
  for (const y of [657, 677]) rect(ctx, "#a3aaa0", 20, y, W - 40, 2);
  for (let x = 31; x < 400; x += 19) rect(ctx, "#536b77", x, 660, 4, 16);
  wall(ctx, 10, 708, W - 20, 52);
  wall(ctx, 10, 692, 45, 68);
  wall(ctx, W - 55, 692, 45, 68);
  text(ctx, "CASTLE  •  SLIDE TO AIM", W / 2, 740, 12);
}

function crag(ctx, x, y, size) {
  polygon(ctx, "#353e39", [x - size, y + 8, x - size * 0.66, y - size * 0.6,
    x + size * 0.35, y - size, x + size, y - 1, x + size * 0.8, y + 12]);
  polygon(ctx, "#696d5b", [x - size, y + 3, x - size * 0.66, y - size * 0.6,
    x + size * 0.35, y - size, x + size * 0.58, y - size * 0.47, x, y - size * 0.24]);
  polygon(ctx, "#898670", [x - size * 0.66, y - size * 0.6, x + size * 0.35, y - size,
    x + size * 0.58, y - size * 0.47, x - size * 0.42, y - size * 0.4]);
}

function terrain(ctx, lanes) {
  const wallY = lanes.left.objective.castleFront;
  rect(ctx, "#596348", 0, 0, W, H);
  rect(ctx, "#222f2c", 0, 0, W, 96);
  polygon(ctx, "#6d7551", [0, 109, 420, 109, 420, 246, 305, 281,
    165, 218, 0, 259]);
  polygon(ctx, "#8d805e", [12, 218, 126, 167, 304, 163, 395, 223,
    390, 292, 367, 371, 387, 449, 400, 506, 20, 506, 42, 392, 46, 286]);
  polygon(ctx, "#ac9870", [18, 459, 114, 412, 237, 395, 385, 451,
    406, wallY, 14, wallY]);
  for (let i = 0; i < 144; i++) {
    const y = 101 + (i * 53) % (wallY - 101);
    rect(ctx, i % 3 ? "#c1af773a" : "#35463266", (i * 73) % W, y, 3 + i % 7, 2);
  }
  // The stream bends into the rocks and runs away to the west.
  polygon(ctx, "#504d40", [0, 267, 56, 281, 115, 276, 175, 240, 213, 265,
    170, 318, 106, 345, 41, 362, 0, 351]);
  polygon(ctx, "#286773", [0, 274, 57, 287, 118, 282, 177, 247, 203, 268,
    166, 311, 104, 339, 38, 354, 0, 343]);
  for (let i = 0; i < 38; i++) {
    const x = (i * 31) % 164;
    const y = 291 - Math.max(0, x - 89) * 0.23 + (i * 17) % 42;
    rect(ctx, i % 3 ? "#438996" : "#78aaa1", x, y, 5 + i % 11, 1);
  }
  bridge(ctx, 80);

  // The taller central ridge forces the main army around its eastern face.
  polygon(ctx, "#474c40", [142, 263, 190, 228, 248, 242, 291, 293,
    284, 350, 256, 401, 201, 425, 156, 388, 134, 343]);
  for (const [x, y, size] of [[190, 257, 39], [233, 272, 43], [159, 292, 28],
    [201, 307, 48], [247, 327, 37], [170, 352, 33], [219, 366, 38], [188, 397, 27],
    [416, 274, 25], [412, 307, 23], [413, 351, 29], [415, 389, 24]]) crag(ctx, x, y, size);

  // One command camp and one open northern staging ground.
  redCamp(ctx, "right", lanes.right.objective);
  tent(ctx, 32, 163, 34, 23, "#ac5e48");
  tent(ctx, 107, 148, 37, 26, "#b76a53");
  for (const x of [31, 131]) {
    rect(ctx, "#574b3a", x, 278, 8, 36);
    rect(ctx, "#b2a283", x - 2, 276, 12, 6);
    rect(ctx, "#ded0a1", x - 3, 272, 14, 5);
  }
  castle(ctx, wallY);
}

export function frontlineGeometry(lane) {
  const { x, width } = passage(lane.id, lane.front);
  return { x: x - width / 2, y: lane.front, width };
}

export function createDualRenderer(state, canvas, battle, createBattlefield) {
  const ctx = canvas.getContext("2d");
  const background = canvas.ownerDocument.createElement("canvas");
  const figures = createFigures(ctx, canvas.ownerDocument);
  const connected = createBattlefield?.(ctx, figures, state, battle);

  function formation(lane, redTeam, celebrating = false) {
    const count = redTeam ? lane.redTotal : lane.blueTotal;
    const size = Math.min(Math.ceil(count), redTeam ? 34 : 76,
      Math.ceil(Math.sqrt(count) * (redTeam ? 0.92 : 1.28)));
    const direction = redTeam ? -1 : 1;
    const depth = redTeam ? lane.front - 96 : 540 - lane.front;
    const spacing = clamp(depth / 7, 5, 16);
    const point = celebrating ? capturePoint(lane.id, lane.objective) : null;
    for (let i = size - 1; i >= 0; i--) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const width = Math.min(7, size - row * 7);
      const y = lane.front + direction * (9 + row * spacing) + Math.sin(i * 17) * 3;
      const path = passage(lane.id, y);
      const center = path.x;
      const x = center + (col - (width - 1) / 2) * Math.min(19, (path.width - 8) / 7)
        + Math.sin(i * 7) * 2;
      if (point) {
        const advance = smoothStep((state.victoryElapsed - row * 0.09) / FLAG_CAPTURE_TIME);
        const destination = point.y - 6 + row * 12 + Math.sin(i * 17) * 3;
        figures.soldier(x + (point.x - x) * advance * 0.46,
          y + (destination - y) * advance, false, 4.8, i + center);
      } else {
        figures.soldier(x, y, redTeam, 4.8, i + crossings[lane.id].center);
      }
    }
  }

  function laneHud(lane, local) {
    const { center } = crossings[lane.id];
    const phalanx = lane.id === "left" && battle.state.phalanx.phase;
    const held = phalanx === "secured";
    const critical = lane.front >= lane.objective.castleFront - 32;
    const dangerTone = critical ? red : amber;
    rect(ctx, local.danger ? "#683d36" : "#2a3e40", center - 90, 50, 180, 42);
    rect(ctx, local.danger ? dangerTone : held ? blue : "#668686", center - 90, 50, 180, 2);
    text(ctx, lane.id === "left" ? "WEST FLANK" : "EAST BREAKTHROUGH", center, 68, 12);
    const label = held ? "PHALANX HOLDING"
      : lane.breached ? "CASTLE BREACHED"
      : local.danger ? (critical ? "▼ BREACH IMMINENT" : "▼ CASTLE AT RISK")
      : !lane.redEntryOpen ? "SUPPLY CUT"
      : phalanx === "unlocked" || phalanx === "marching" ? "MEOWRTANS MARCHING"
      : phalanx === "deploying" ? "SHIELDS LOCKING"
      : `BLUE ${countFormat.format(Math.ceil(lane.blueTotal))}`;
    text(ctx, label, center, 84, 10, local.danger ? dangerTone : blue);
    if (lane.id === "left" && !held) {
      const capacity = lane.combat.bluePressureCapacity;
      rect(ctx, "#172c30", center - 64, 97, 128, 3);
      rect(ctx, lane.blueTotal >= capacity ? amber : blue, center - 64, 97,
        128 * Math.min(1, lane.blueTotal / capacity), 3);
      text(ctx, lane.blueTotal >= capacity ? "CHOKE FULL" : "CHOKE CAPACITY", center, 110, 8, "#e5d7b5");
    }
  }

  function redHorde() {
    const { lanes: { left, right }, retreat } = battle.state;
    const total = left.redTotal + right.redTotal;
    text(ctx, retreat ? "RED HORDE ROUTED" :
      `RED HORDE  •  ${countFormat.format(Math.ceil(total))}`, W / 2, 37, 18, retreat ? blue : red);
    // Shared staging rows represent the unpictured portion of the two lanes.
    const available = Math.max(0, Math.floor(left.redTotal) + Math.floor(right.redTotal) - 78);
    const count = Math.min(Math.floor(available), 72, Math.ceil(Math.sqrt(available) * 1.75));
    for (let i = count - 1; i >= 0; i--) {
      const x = 27 + (i % 13) * 30 + Math.sin(i * 32) * 6;
      const front = x < W / 2 ? left.front : right.front;
      if (front < 178) continue;
      const y = Math.min(front - 51, 138 + Math.floor(i / 13) * 16 + (i % 4) * 3);
      figures.soldier(x, y, true, 4.3, i + 400);
    }
    if (!retreat) return;
    const time = state.victoryElapsed;
    const fleeing = Math.min(34, Math.ceil(retreat.count));
    for (let i = 0; i < fleeing; i++) {
      const y = left.front - 12 - Math.floor(i / 7) * 15 - time * 155;
      if (y < 97) continue;
      figures.soldier(passage("left", y).x + (i % 7 - 3) * 9, y, true, 4.6, i + 500);
    }
  }

  function drawPhalanx(lane) {
    const { phase, since } = battle.state.phalanx;
    if (phase === "locked") return;
    const age = state.t - since;
    const rules = LEVEL_FOUR.phalanx;
    const march = phase === "unlocked" ? 0 : phase === "marching" ? smoothStep(age / rules.marchTime) : 1;
    const lock = phase === "secured" ? 1 : phase === "deploying" ? smoothStep(age / rules.deployTime) : 0;
    const victory = battle.state.outcome === "victory";
    const salute = victory ? smoothStep((state.victoryElapsed - 0.25) / 0.5) : 0;
    const fight = !victory && phase === "secured" && lane.redTotal > 0;
    const brace = fight ? Math.max(0, Math.sin(state.t * 7)) : 0;
    const line = lane.front + 9 + (1 - lock) * 28;
    for (let row = 1; row >= 0; row--) {
      for (let col = 0; col < 5; col++) {
        const foot = (1 - march) * Math.sin(state.t * 24 + col) * 2;
        const y = 523 + (line - 523) * march + row * (26 - lock * 13) + foot;
        const x = 63 + (passage("left", y).x - 63) * march + (col - 2) * (9 + lock * 2);
        const shieldY = y + 4 - lock * 5 - brace * 2 - salute * 9;
        figures.soldier(x, y, false, 5.5, row * 5 + col + 931);
        // Bronze caps, facing spears and overlapping round shields.
        ctx.strokeStyle = "#ead7a1";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 7);
        ctx.lineTo(x + 8 - lock * 4 + salute * 4, y - 22 - brace * 6 - salute * 5);
        ctx.stroke();
        polygon(ctx, "#fff0ba", [x + 4 + salute * 4, y - 22 - brace * 6 - salute * 5,
          x + 3 + salute * 4, y - 17 - brace * 6 - salute * 5,
          x + 7 + salute * 4, y - 18 - brace * 6 - salute * 5]);
        rect(ctx, "#e1a856", x - 4, y - 6, 8, 4);
        rect(ctx, "#f7ce78", x - 3, y - 7, 6, 2);
        for (const [radius, color] of shield) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x - 1, shieldY, radius, 0, TAU);
          ctx.fill();
        }
      }
    }
    if (phase === "secured" && age < 2.7 && !victory) {
      rect(ctx, "#243a3deb", 74, 102, 272, 25);
      text(ctx, "THE MEOWRTANS HOLD THE LINE", W / 2, 119, 13, "#ffe4a0");
    }
  }

  function supplyFlag(lane, celebrating = false) {
    const { x, y: base } = capturePoint(lane.id, lane.objective);
    const elapsed = state.victoryElapsed;
    const exchange = celebrating ? (elapsed - FLAG_CAPTURE_TIME) / FLAG_RAISE_TIME : -1;
    const captured = exchange >= 1 / 3;
    const progress = captured ? smoothStep((exchange - 1 / 3) * 1.5) : smoothStep(exchange * 3);
    const y = captured ? base + 2 - progress * 21 : base - 19 + progress * 21;
    const width = captured ? 18 + progress * 18 : 30 - progress * 12;
    const wave = Math.sin((state.t + elapsed) * 14) * 2;
    rect(ctx, "#e8dba8", x - 1, base - 21, 3, 23);
    polygon(ctx, captured ? "#328fe8" : lane.redEntryOpen ? "#ca5b4c" : "#a65043", [
      x, y, x + width, y + wave, x + width - 6, y + 6,
      x + width, y + 12 + wave, x, y + 13,
    ]);
    if (!captured) return;
    const age = (elapsed - FLAG_CAPTURE_TIME - FLAG_RAISE_TIME) / 1.45;
    if (age < 0 || age >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    for (let i = 0; i < 16; i++) {
      const angle = i * 2.4;
      const spread = smoothStep(age) * (22 + i % 7 * 9);
      rect(ctx, i % 2 ? blue : "#ffe39f",
        x + Math.cos(angle) * spread, base + Math.sin(angle) * spread * 0.42 + age ** 2 * 34, 3, 5);
    }
    ctx.restore();
  }

  function drawLane(lane, local) {
    const { center, edge, width } = crossings[lane.id];
    if (battle.state.outcome === "victory") {
      laneHud(lane, local);
      formation(lane, false, lane.id === "right");
      if (lane.id === "right") supplyFlag(lane, true);
      else drawPhalanx(lane);
      return;
    }
    const front = frontlineGeometry(lane);
    const contactX = front.x + front.width / 2;
    const playing = state.mode === "playing";
    if (local.danger) {
      const critical = lane.front >= lane.objective.castleFront - 32;
      const tint = critical ? red : amber;
      rect(ctx, critical ? "#ed58474a" : "#e76c3238", edge, southBank + 10,
        width, lane.objective.castleFront - southBank - 10);
      rect(ctx, tint, edge, lane.objective.castleFront, width, 3);
      rect(ctx, tint, edge + width - 3, front.y - 6, 3, 12);
    }
    if (playing && local.redIntake > 0 && state.t - local.redPulse < 0.25) {
      const count = Math.min(5, Math.ceil(local.redIntake / 7));
      for (let i = 0; i < count; i++)
        figures.soldier(center + (i - (count - 1) / 2) * 12,
          Math.min(lane.front - 10, 124 + (state.t - local.redPulse) * 52), true, 4.1, i + center);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(edge + 3, 91, width - 6, 456);
    ctx.clip();
    rect(ctx, "#382a27a0", front.x, front.y - 3, front.width, 6);
    const tone = local.direction > 0 ? red : blue;
    for (let x = front.x + 3; x < front.x + front.width - 7; x += 13)
      rect(ctx, tone, x, front.y - 1, 7, 2);
    if (lane.id !== "left" || battle.state.phalanx.phase !== "secured") {
      const arrow = local.direction > 0 ? 1 : -1;
      for (const x of [front.x + 4, front.x + front.width - 4])
        polygon(ctx, tone, [x - 4, front.y, x + 4, front.y, x, front.y + 9 * arrow]);
    }
    formation(lane, true);
    formation(lane, false);
    if (playing) {
      for (const squad of lane.squads) {
        const destination = passage(lane.id, squad.y).x + (1 - (squad.id + 2) % 3) * 11;
        const x = squad.origin + (destination - squad.origin) * clamp(squad.marchTime * 2.7, 0, 1);
        figures.soldier(x, squad.y, false, squad.multiplier > 20 ? 5.8 : 4.9, squad.id);
        if (squad.multiplier === 999) {
          for (let i = 1; i <= 5; i++)
            figures.soldier(x + (i % 2 ? 1 : -1) * (6 + i * 2),
              squad.y + i * 4, false, 4.4, squad.id * 7 + i);
        }
      }
      figures.airborne(local.flights.active);
    }
    const age = state.t - local.clashAt;
    if (playing && age < 0.16 && state.t - local.contact < 0.05) {
      const x = contactX + Math.sin(local.clashAt * 23) * front.width * 0.31;
      for (let i = -2; i <= 2; i++)
        rect(ctx, "#fff0b2", x + i * (5 + age * 26), front.y - Math.abs(i) * 3 - age * 27, 2, 4);
    }
    if (playing && (state.t - local.arrivalAt < 0.25 || state.t - local.reversedAt < 0.5)) {
      const arrival = local.arrivalAt > local.reversedAt;
      ctx.strokeStyle = arrival ? blue : tone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(contactX, front.y + (arrival ? 12 : 0), Math.min(front.width * 0.43, arrival ? 28 : 59), 5, 0, 0, TAU);
      ctx.stroke();
    }
    if (playing && state.t - local.cutoffAt < 1.5)
      text(ctx, "SUPPLY CUT!", center, 152, 14, blue);
    ctx.restore();
    if (lane.id === "right") supplyFlag(lane);
    else drawPhalanx(lane);
    laneHud(lane, local);
  }

  function drawGate(gate) {
    const { x, hitY, width } = gate;
    const left = x - width / 2;
    const phalanx = gate.mult === null;
    const color = gate.mult === 20 ? blue : gate.mult === 999 ? "#ffdb91" : amber;
    const lit = state.mode === "playing" && state.t - gate.flashAt < 0.13;
    rect(ctx, "#302f30", left, hitY - 37, width, 46);
    const fill = lit ? (gate.mult === 999 ? "#87d5ed" : "#568aa1") : "#4b5960";
    rect(ctx, fill, left + 4, hitY - 15, width - 8, 23);
    rect(ctx, color, left, hitY - 37, width, 3);
    rect(ctx, color, left, hitY - 14, 4, 20);
    rect(ctx, color, left + width - 4, hitY - 14, 4, 20);
    rect(ctx, gate.open ? color : "#817063", left, hitY, width, 2);
    text(ctx, phalanx ? "PHALANX" : `×${gate.mult}`, x, hitY - 19, phalanx ? 9 : 17, color);
    if (!gate.barricadeId) return;
    const slot = barrierIndex(state, gate.barricadeId);
    const { progress } = barrierStatus(state, slot);
    const y = state.level.barricades[slot].hitY;
    const flash = state.barricadeFlashes[slot];
    if (!gate.open) {
      const plank = (width - 8) / 8;
      for (let i = 0; i < 8; i++) {
        const top = y - 13 + (i % 3) * 2 + (progress * i % 4);
        rect(ctx, i % 2 ? "#9e6a42" : "#b88454", left + 4 + i * plank, top, plank - 1, y + 5 - top);
      }
      rect(ctx, flash > 0.16 ? "#e9b779" : "#40332c", left, y, width, 2);
      rect(ctx, "#44372f", left + 6, y + 8, width - 12, 4);
      rect(ctx, amber, left + 6, y + 8, (width - 12) * progress, 4);
      text(ctx, `BREAK • ${Math.floor(progress * 100)}%`, x, y + 25, 9);
    } else {
      text(ctx, phalanx ? "RELEASED" : "OPEN", x, hitY + 26, 9, amber);
      if (flash > 0 && state.mode === "playing") {
        const age = 1 - flash / 0.48;
        ctx.save();
        ctx.globalAlpha = 1 - age;
        for (let i = 0; i < 9; i++) {
          const offset = (i - 4) / 4;
          rect(ctx, i % 2 ? "#b88454" : "#f6d297",
            x + offset * (width * 0.42 + age * 19), y - age * (28 - i % 4 * 4) + 28 * age ** 2,
            3 + i % 3, 3);
        }
        ctx.restore();
      }
    }
  }

  function draw() {
    const started = connected ? performance.now() : 0;
    ctx.drawImage(background, 0, 0, W, H);
    if (!battle.state.lanes) return;
    figures.setClock(state.t + state.victoryElapsed);
    if (connected) connected.draw();
    else {
      redHorde();
      for (const id of CROSSINGS) drawLane(battle.state.lanes[id], battle.feedback[id]);
    }
    for (const target of state.gates) drawGate(target);
    if (state.mode === "playing") {
      for (let offset = -9; offset <= 9; offset += 9) {
        const x = state.gunX + offset;
        let target;
        for (const gate of state.gates) {
          if (gate.mult === null && gate.open) continue;
          if (Math.abs(gate.x - x) <= gate.width / 2) {
            target = gate;
            break;
          }
        }
        const y = target?.open ? target.hitY :
          target ? state.level.barricades[barrierIndex(state, target.barricadeId)].hitY : 594;
        const tint = target ? (target.mult === 20 ? "#79d9ff" : amber) : "#c1b99c";
        for (let dot = state.level.battlefield.shotY - 7; dot >= y; dot -= 7)
          rect(ctx, tint, x - 0.5, dot, 1.5, 3);
      }
      for (const shot of state.shots) figures.projectile(shot);
    }
    drawCannon(ctx, state);
    connected?.recordDraw(performance.now() - started);
  }

  return {
    draw,
    reset: connected?.reset,
    receive: connected?.receive,
    snapshot: connected?.snapshot,
    frame: connected?.frame,
    resize() {
      const pixel = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = background.width = Math.floor(W * pixel);
      canvas.height = background.height = Math.floor(H * pixel);
      ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
      const ground = background.getContext("2d");
      ground.setTransform(pixel, 0, 0, pixel, 0, 0);
      if (connected) connected.terrain(ground);
      else terrain(ground, LEVEL_FOUR.crossings);
      draw();
    },
  };
}
