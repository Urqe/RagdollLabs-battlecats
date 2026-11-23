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
const northBank = 254;
const southBank = 412;
const bridgeHalfWidth = 82;

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
  const edge = center - bridgeHalfWidth;
  const width = bridgeHalfWidth * 2;
  const top = northBank - 12;
  const bottom = southBank + 10;
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

function terrain(ctx, lanes) {
  const wallY = lanes.left.objective.castleFront;
  rect(ctx, "#48523c", 0, 0, W, H);
  rect(ctx, "#222f2c", 0, 0, W, 94);
  rect(ctx, "#657151", 0, southBank, W, wallY - southBank);
  for (let i = 0; i < 110; i++) {
    const y = 99 + (i * 53) % (wallY - 99);
    rect(ctx, i % 3 ? "#83845b" : "#354632", (i * 73) % W, y, 3 + i % 7, 2);
  }
  rect(ctx, "#8c8263", 18, wallY - 18, W - 36, 20);
  for (const id of CROSSINGS) {
    const { center: x } = crossings[id];
    polygon(ctx, "#817455", [x - 29, 94, x + 29, 94, x + 42, 177,
      x + 77, northBank, x - 77, northBank, x - 43, 171]);
    polygon(ctx, "#a49771", [x - 76, southBank, x + 76, southBank,
      x + 60, 456, x + 70, wallY - 16, x - 70, wallY - 16, x - 60, 450]);
    redCamp(ctx, id, lanes[id].objective);
  }
  // Both bridges interrupt the same banks and span the same river.
  polygon(ctx, "#a49970", [0, northBank - 8, 98, northBank - 2, 207, northBank - 12,
    321, northBank, W, northBank - 9, W, southBank + 9, 320, southBank + 1,
    208, southBank + 12, 98, southBank, 0, southBank + 10]);
  polygon(ctx, "#286773", [0, northBank, 98, northBank + 5, 207, northBank - 5,
    321, northBank + 6, W, northBank - 2, W, southBank + 3, 320, southBank - 6,
    208, southBank + 6, 98, southBank - 6, 0, southBank + 4]);
  for (let i = 0; i < 88; i++) {
    const x = (i * 79) % W;
    const y = northBank + 12 + (i * 31) % (southBank - northBank - 24);
    rect(ctx, i % 3 ? "#3e8490" : "#69a298", x, y, 6 + i % 18, 1 + i % 2);
  }
  for (const id of CROSSINGS) bridge(ctx, crossings[id].center);
  castle(ctx, wallY);
}

export function frontlineGeometry(lane) {
  const { edge, width } = crossings[lane.id];
  return { x: edge + 9, y: lane.front, width: width - 18 };
}

export function createDualRenderer(state, canvas, battle) {
  const ctx = canvas.getContext("2d");
  const background = canvas.ownerDocument.createElement("canvas");
  const figures = createFigures(ctx, canvas.ownerDocument);

  function formation(lane, redTeam, celebrating = false) {
    const { center } = crossings[lane.id];
    const count = redTeam ? lane.redTotal : lane.blueTotal;
    const size = Math.min(30, Math.ceil(Math.sqrt(count) * 1.28));
    const direction = redTeam ? -1 : 1;
    const depth = redTeam ? lane.front - 96 : 540 - lane.front;
    const spacing = clamp(depth / 7, 5, 16);
    const point = celebrating ? capturePoint(lane.id, lane.objective) : null;
    for (let i = size - 1; i >= 0; i--) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const width = Math.min(7, size - row * 7);
      const x = center + (col - (width - 1) / 2) * 19 + Math.sin(i * 7) * 3;
      const y = lane.front + direction * (9 + row * spacing) + Math.sin(i * 17) * 3;
      if (point) {
        const advance = smoothStep((state.victoryElapsed - row * 0.09) / FLAG_CAPTURE_TIME);
        const destination = point.y - 6 + row * 12 + Math.sin(i * 17) * 3;
        figures.soldier(x + (point.x - x) * advance * 0.46,
          y + (destination - y) * advance, false, 4.8, i + center);
      } else {
        figures.soldier(x, y, redTeam, 4.8, i + center);
      }
    }
  }

  function laneHud(lane, local) {
    const { center, edge, width, name } = crossings[lane.id];
    const critical = lane.front >= lane.objective.castleFront - 32;
    const dangerTone = critical ? red : amber;
    rect(ctx, local.danger ? (critical ? "#78382f" : "#673c38") : "#243941", edge, 18, width, 72);
    rect(ctx, local.danger ? dangerTone : "#729da2", edge, 18, width, 2);
    text(ctx, name, center, 37, 13);
    const share = lane.blueTotal / (lane.blueTotal + lane.redTotal || 1);
    rect(ctx, "#3b4a4f", edge + 12, 46, width - 24, 6);
    rect(ctx, blue, edge + 12, 46, (width - 24) * share, 6);
    rect(ctx, red, edge + 12 + (width - 24) * share, 46, (width - 24) *
      (lane.redTotal ? 1 - share : 0), 6);
    text(ctx, Math.ceil(lane.blueTotal), edge + 27, 68, 12, blue);
    text(ctx, Math.ceil(lane.redTotal), edge + width - 27, 68, 12, red);
    const supply = lane.redEntryOpen ? "RED SUPPLY OPEN" : "SUPPLY SECURED";
    text(ctx, supply, center, 82, 9, lane.redEntryOpen ? red : blue);
    if (local.danger) {
      rect(ctx, critical ? "#873f33" : "#624e37", edge + 6, 91, width - 12, 18);
      text(ctx, lane.breached ? "CASTLE BREACHED" : critical ? "▼  BREACH IMMINENT" : "▼  CASTLE AT RISK",
        center, 104, 11, dangerTone);
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
      text(ctx, crossings[lane.id].name, center, 37, 13);
      text(ctx, state.victoryElapsed >= FLAG_CAPTURE_TIME + FLAG_RAISE_TIME ?
        "FLAG CAPTURED" : "SUPPLY SECURED", center, 58, 12, blue);
      formation(lane, false, true);
      supplyFlag(lane, true);
      return;
    }
    const front = frontlineGeometry(lane);
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
    for (let i = 0; i < 9; i++)
      rect(ctx, tone, front.x + i * 18 + 2, front.y - 1, 10, 2);
    const arrow = local.direction > 0 ? 1 : -1;
    for (const x of [front.x + 4, front.x + front.width - 4])
      polygon(ctx, tone, [x - 4, front.y, x + 4, front.y, x, front.y + 9 * arrow]);
    formation(lane, true);
    formation(lane, false);
    if (playing) {
      for (const squad of lane.squads) {
        const destination = center + (1 - (squad.id + 2) % 3) * 14;
        const x = squad.origin + (destination - squad.origin) * clamp(squad.marchTime * 2.7, 0, 1);
        figures.soldier(x, squad.y, false, squad.multiplier > 20 ? 5.8 : 4.9, squad.id);
      }
      figures.airborne(local.flights.active);
    }
    const age = state.t - local.clashAt;
    if (playing && age < 0.16 && state.t - local.contact < 0.05) {
      const x = center + Math.sin(local.clashAt * 23) * 42;
      for (let i = -2; i <= 2; i++)
        rect(ctx, "#fff0b2", x + i * (5 + age * 26), front.y - Math.abs(i) * 3 - age * 27, 2, 4);
    }
    if (playing && (state.t - local.arrivalAt < 0.25 || state.t - local.reversedAt < 0.5)) {
      const arrival = local.arrivalAt > local.reversedAt;
      ctx.strokeStyle = arrival ? blue : tone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(center, front.y + (arrival ? 12 : 0), arrival ? 28 : 59, 5, 0, 0, TAU);
      ctx.stroke();
    }
    if (playing && state.t - local.cutoffAt < 1.5)
      text(ctx, "SUPPLY CUT!", center, 152, 14, blue);
    ctx.restore();
    supplyFlag(lane);
    laneHud(lane, local);
  }

  function drawGate(gate) {
    const { x, hitY, width } = gate;
    const left = x - width / 2;
    const color = gate.mult === 20 ? blue : amber;
    const lit = state.mode === "playing" && state.t - gate.flashAt < 0.13;
    rect(ctx, "#302f30", left, hitY - 37, width, 46);
    rect(ctx, lit ? "#568aa1" : "#4b5960", left + 4, hitY - 15, width - 8, 23);
    rect(ctx, color, left, hitY - 37, width, 3);
    rect(ctx, color, left, hitY - 14, 4, 20);
    rect(ctx, color, left + width - 4, hitY - 14, 4, 20);
    rect(ctx, gate.open ? color : "#817063", left, hitY, width, 2);
    text(ctx, `×${gate.mult}`, x, hitY - 19, 17, color);
    if (!gate.open) {
      const slot = barrierIndex(state, gate.barricadeId);
      const { progress } = barrierStatus(state, slot);
      const y = state.level.barricades[slot].hitY;
      for (let i = 0; i < 8; i++) {
        const top = y - 13 + (i % 3) * 2 + (progress * i % 4);
        rect(ctx, i % 2 ? "#9e6a42" : "#b88454", left + 4 + i * 10, top, 8, y + 5 - top);
      }
      rect(ctx, "#40332c", left, y, width, 2);
      rect(ctx, "#44372f", left + 6, y + 8, width - 12, 4);
      rect(ctx, amber, left + 6, y + 8, (width - 12) * progress, 4);
      text(ctx, `BREAK • ${Math.floor(progress * 100)}%`, x, y + 25, 9);
    } else if (gate.barricadeId) {
      text(ctx, "OPEN", x, hitY + 26, 9, amber);
    }
  }

  function draw() {
    ctx.drawImage(background, 0, 0, W, H);
    if (!battle.state.lanes) return;
    figures.setClock(state.t + state.victoryElapsed);
    for (const id of CROSSINGS) drawLane(battle.state.lanes[id], battle.feedback[id]);
    for (const target of state.gates) drawGate(target);
    if (state.mode === "playing") {
      for (let offset = -9; offset <= 9; offset += 9) {
        const x = state.gunX + offset;
        let target;
        for (const gate of state.gates) {
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
  }

  return {
    draw,
    resize() {
      const pixel = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = background.width = Math.floor(W * pixel);
      canvas.height = background.height = Math.floor(H * pixel);
      ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
      const ground = background.getContext("2d");
      ground.setTransform(pixel, 0, 0, pixel, 0, 0);
      terrain(ground, LEVEL_FOUR.crossings);
      draw();
    },
  };
}
