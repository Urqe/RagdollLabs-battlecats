import { barrierIndex, barrierStatus } from "./barricades.js";
import { clamp, H, TAU, W } from "./config.js";
import { crossings } from "./dual-battlefield.js";
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

function wall(ctx, x, y, width, height) {
  rect(ctx, "#2d3c48", x, y + 6, width, height);
  rect(ctx, "#516675", x, y, width, height);
  for (let i = 0; i < width - 10; i += 20) {
    rect(ctx, "#84949a", x + i, y - 5, 12, 9);
    rect(ctx, "#3b4e5c", x + i + 4, y + 15, 13, 2);
  }
}

function terrain(ctx) {
  rect(ctx, "#313f39", 0, 0, W, H);
  rect(ctx, "#14262e", 0, 0, W, 104);
  rect(ctx, "#234d56", 0, 219, W, 257);
  rect(ctx, "#31727a", 0, 228, W, 235);
  for (let i = 0; i < 108; i++) {
    const x = (i * 73) % W;
    const y = 235 + (i * 31) % 223;
    rect(ctx, i % 3 ? "#3d8187" : "#28616d", x, y, 4 + i % 13, 1);
  }
  for (const id of CROSSINGS) {
    const { edge, center, width } = crossings[id];
    rect(ctx, "#23373c", edge - 4, 95, width + 10, 441);
    rect(ctx, "#687164", edge + 1, 103, width - 2, 430);
    rect(ctx, "#777964", edge + 10, 109, width - 20, 419);
    for (let i = 0; i < 52; i++) {
      rect(ctx, "#8b897022", edge + 11 + (i * 29) % 149,
        115 + (i * 47) % 410, 4 + i % 7, 2);
    }
    rect(ctx, "#493e39", edge, 231, width, 226);
    for (let y = 234; y < 455; y += 12) {
      rect(ctx, y % 5 ? "#9d8063" : "#aa8b67", edge + 5, y, width - 10, 10);
      rect(ctx, "#bb9b724f", edge + 8, y + 1, width - 17, 1);
    }
    for (const x of [edge + 1, edge + width - 7]) {
      rect(ctx, "#504135", x, 226, 6, 234);
      for (let y = 231; y < 460; y += 27) {
        rect(ctx, "#baa586", x - 1, y, 8, 5);
      }
    }
    wall(ctx, center - 48, 104, 96, 15);
    rect(ctx, "#342f35", center - 23, 111, 46, 9);
    rect(ctx, "#413e39", edge + 4, 513, width - 8, 10);
    rect(ctx, "#938b73", edge + 7, 515, width - 14, 3);
  }
  rect(ctx, "#66685e", 14, 532, 392, 169);
  for (let y = 537; y < 700; y += 16) {
    for (let x = 15 + (y % 3) * 5; x < 391; x += 26)
      rect(ctx, "#7f80744d", x, y, 21, 13);
  }
  rect(ctx, "#354955", 19, 656, 382, 26);
  rect(ctx, "#849297", 19, 657, 382, 2);
  rect(ctx, "#849297", 19, 677, 382, 2);
  for (let x = 31; x < 400; x += 19) rect(ctx, "#536b77", x, 660, 4, 16);
  wall(ctx, 0, 707, W, 53);
  wall(ctx, 0, 691, 52, 69);
  wall(ctx, 368, 691, 52, 69);
  rect(ctx, "#273942", 80, 720, 260, 24);
  text(ctx, "CASTLE • SLIDE TO AIM", 210, 737, 12);
}

export function frontlineGeometry(lane) {
  const { edge, width } = crossings[lane.id];
  return { x: edge + 9, y: lane.front, width: width - 18 };
}

export function createDualRenderer(state, canvas, fixture) {
  const ctx = canvas.getContext("2d");
  const background = canvas.ownerDocument.createElement("canvas");
  const figures = createFigures(ctx, canvas.ownerDocument);

  function formation(lane, redTeam) {
    const { center } = crossings[lane.id];
    const count = redTeam ? lane.redTotal : lane.blueTotal;
    const size = Math.min(30, Math.ceil(Math.sqrt(count) * 1.28));
    const direction = redTeam ? -1 : 1;
    const depth = redTeam ? lane.front - 125 : 540 - lane.front;
    const spacing = clamp(depth / 7, 5, 16);
    for (let i = size - 1; i >= 0; i--) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const width = Math.min(7, size - row * 7);
      const x = center + (col - (width - 1) / 2) * 19 + Math.sin(i * 7) * 3;
      const y = lane.front + direction * (9 + row * spacing) + Math.sin(i * 17) * 3;
      figures.soldier(x, y, redTeam, 4.8, i + center);
    }
  }

  function laneHud(lane, local) {
    const { center, edge, width, name } = crossings[lane.id];
    rect(ctx, local.danger ? "#673c38" : "#243941", edge, 18, width, 72);
    rect(ctx, local.danger ? amber : "#729da2", edge, 18, width, 2);
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
      const fresh = state.t - local.dangerAt < 1.8;
      rect(ctx, fresh ? "#9a4730" : "#654036", edge + 14, 486, width - 28, 22);
      text(ctx, lane.breached ? "CASTLE BREACHED" : "▼  CASTLE AT RISK", center, 501, 12, amber);
    }
  }

  function drawLane(lane, local) {
    const { center, edge, width } = crossings[lane.id];
    const front = frontlineGeometry(lane);
    const playing = state.mode === "playing";
    if (local.danger) {
      rect(ctx, "#e76c3238", edge, 123, width, 396);
      rect(ctx, amber, edge, 123, 3, 396);
      rect(ctx, amber, edge + width - 3, 123, 3, 396);
    }
    const flagColor = lane.redEntryOpen ? "#b94e4b" : "#358fc2";
    for (const direction of [-1, 1]) {
      const x = center + direction * 61;
      rect(ctx, "#d6c8ad", x, 106, 2, 33);
      polygon(ctx, flagColor, [x, 105, x - direction * 23, 108,
        x - direction * 18, 116, x - direction * 23, 121, x, 119]);
    }
    if (playing && local.redIntake > 0 && state.t - local.redPulse < 0.25) {
      const count = Math.min(5, Math.ceil(local.redIntake / 7));
      for (let i = 0; i < count; i++)
        figures.soldier(center + (i - (count - 1) / 2) * 12,
          124 + (state.t - local.redPulse) * 52, true, 4.1, i + center);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(edge + 3, 121, width - 6, 426);
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
    laneHud(lane, local);
  }

  function gate(gate) {
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
      text(ctx, "BREAK", x, y + 25, 9);
    }
  }

  function draw() {
    ctx.drawImage(background, 0, 0, W, H);
    if (!fixture.state.lanes) return;
    figures.setClock(state.t);
    for (const id of CROSSINGS) drawLane(fixture.state.lanes[id], fixture.feedback[id]);
    for (const target of state.gates) gate(target);
    if (state.mode === "playing") {
      for (const offset of [-9, 0, 9]) {
        const x = state.gunX + offset;
        const target = state.gates.find(g => Math.abs(g.x - x) <= g.width / 2);
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
      terrain(ground);
      draw();
    },
  };
}
