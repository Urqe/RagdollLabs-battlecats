import { smoothStep, victoryAdvance } from "./army-movement.js";
import { H, TAU, W, clamp } from "./config.js";
import {
  drawArtilleryShot,
  drawCatapult,
  drawImpactBurst,
  drawImpactGround,
} from "./artillery-render.js";
import { drawArcherCrew, drawArcherVolley } from "./archer-render.js";
import { barrierIndex, barrierStatus } from "./barricades.js";
import { createFigures } from "./figures.js";
import { drawTerrain, laneHalfWidth, polygon } from "./terrain.js";
import { createMotion, waveProfile } from "./motion.js";

const palettes = [
  { light: "#b5f1ff", face: "#2279b2", dark: "#194560", glow: "#64d8ff" },
  { light: "#ffe2a0", face: "#b56824", dark: "#67452d", glow: "#ffc369" },
  { light: "#fff4b4", face: "#96661f", dark: "#634c53", glow: "#ffdf6c" },
];

export function createRenderer(state, canvas, motion = createMotion()) {
  const ctx = canvas.getContext("2d");
  const terrain = canvas.ownerDocument?.createElement("canvas");
  if (terrain) terrain.width = 0;
  const figures = createFigures(ctx, canvas.ownerDocument);
  const pulses = new Float32Array(3);

  function ellipse(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, TAU);
    ctx.fill();
  }

  function label(text, x, y, size, color, outline = "#242936") {
    ctx.font = `900 ${size}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function gateGround(gate, index) {
    const { x, width } = gate;
    const left = x - width / 2;
    const right = x + width / 2;
    polygon(ctx, "#27282c44", [
      left - 4,
      557,
      right + 5,
      557,
      right + 18,
      580,
      left + 8,
      580,
    ]);
    polygon(ctx, "#555a55", [
      left,
      562,
      right,
      562,
      right + 4,
      573,
      left - 4,
      573,
    ]);
    ctx.fillStyle = gate.open ? palettes[index].face : "#655248";
    ctx.fillRect(left + 4, 561, width - 8, 5);
    const pulse = pulses[index];
    if (!gate.open || pulse === 0) return;
    ctx.save();
    const y = gate.hitY - 15;
    ctx.strokeStyle = palettes[index].glow;
    const rings = index === 0 ? 1 : index === 1 ? 2 : 3;
    for (let i = 0; i < rings; i++) {
      const age = clamp(1 - pulse - i * 0.17, 0, 1);
      const radius = 7 + age * (index === 2 ? 60 : index === 1 ? 46 : 20);
      ctx.globalAlpha =
        ((1 - age) * (index === 0 ? 0.42 : 0.57)) / (1 + i * 0.4);
      ctx.lineWidth = index === 2 ? 2.7 : 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y - i * 12, radius, radius * 0.34, 0, 0, TAU);
      ctx.stroke();
    }
    if (index === 2) {
      ctx.fillStyle = "#ffe6a8";
      ctx.globalAlpha = pulse * 0.11;
      ctx.fillRect(left + 11, y - 10, width - 19, 23);
    }
    ctx.restore();
  }

  function drawBarricade(gate, index, left, right) {
    const slot = barrierIndex(state, gate.barricadeId);
    const { progress, label: status } = barrierStatus(state, slot);
    const y = state.level.barricades[slot].hitY;
    const flash = state.barricadeFlashes[slot];
    const width = (right - left - 12) / 7;
    ctx.save();
    if (flash > 0) ctx.translate(Math.sin(flash * 105) * flash * 20, -flash * 5);
    for (let i = 0; i < 7; i++) {
      const x = left + 6 + i * width;
      const damage = clamp(progress * 1.43 - ((i * 5) % 7) * 0.1, 0, 1);
      if (damage > 0.89 && i % 3 !== 0) continue;
      const top = y - 20 + damage * 14;
      polygon(ctx, "#513726", [
        x,
        y + 13,
        x - 1,
        top + 3,
        x + width - 1,
        top,
        x + width,
        y + 13,
      ]);
      polygon(ctx, i % 2 ? "#b98150" : "#c79562", [
        x + 1,
        y + 10,
        x + 1,
        top + 3,
        x + width - 3,
        top + 1,
        x + width - 3,
        y + 10,
      ]);
      ctx.fillStyle = "#855b3c";
      ctx.fillRect(x + 3, top + 5, 1.2, Math.max(1, 17 - damage * 8));
      if (damage > 0.12) {
        ctx.strokeStyle = "#513726";
        ctx.lineWidth = 1.3 + damage * 0.6;
        ctx.beginPath();
        ctx.moveTo(x + width - 3, top + 1);
        ctx.lineTo(x + 4, top + 8);
        ctx.lineTo(x + width - 6, top + 11);
        ctx.lineTo(x + 3, top + 11 + damage * 7);
        if (damage > 0.45) {
          ctx.moveTo(x + width - 6, top + 11);
          ctx.lineTo(x + width - 1, top + 15);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#6e4934";
    ctx.fillRect(left + 5, y + 5, right - left - 10, 4);
    if (index === 2 && progress < 0.86) {
      const offset = progress * 6;
      polygon(ctx, "#665955", [
        left + 9,
        y + 3,
        right - 7,
        y - 15 + offset,
        right - 7,
        y - 11 + offset,
        left + 9,
        y + 7,
      ]);
      ctx.fillStyle = "#cabd9c";
      ctx.fillRect(left + 13, y + 3, 3, 2);
      ctx.fillRect(right - 13, y - 12 + offset, 3, 2);
    }
    ctx.fillStyle = "#282b32";
    ctx.fillRect(left + 12, y + 17, right - left - 24, 4);
    ctx.fillStyle = "#ffd181";
    ctx.fillRect(left + 12, y + 17, (right - left - 24) * progress, 4);
    label(status, gate.x, y + 1, 12, "#fff0ca", "#4b3020");
    label("SHOOT TO BREAK", gate.x, y + 32, 8, "#fff0ca", "#4b3020");
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.7;
      ctx.fillStyle = "#ffd89a";
      ctx.fillRect(left + 5, y - 10, right - left - 10, 20);
    }
    ctx.restore();
  }

  function drawGate(gate, index) {
    const { x, width } = gate;
    const left = x - width / 2;
    const right = x + width / 2;
    const tilt = index === 0 ? 3 : index === 2 ? -3 : 0;
    const palette = palettes[index];
    const light = gate.open ? palette.light : "#c5aa85";
    const dark = gate.open ? palette.dark : "#5d5046";
    for (let side = 0; side < 2; side++) {
      const a = side === 0 ? left : right - 9;
      const y = 503 + (side === 0 ? 0 : tilt);
      polygon(ctx, dark, [a, y, a + 9, y, a + 9, 564, a, 567]);
      polygon(ctx, "#302e34", [
        a + 9,
        y,
        a + 14,
        y + 4,
        a + 14,
        562,
        a + 9,
        564,
      ]);
      ctx.fillStyle = light;
      ctx.fillRect(a, y + 3, 2, 56 - (y - 503));
      ctx.fillRect(a - 2, 560, 12, 4);
    }
    polygon(ctx, light, [
      left - 1,
      502,
      right + 1,
      502 + tilt,
      right + 7,
      507 + tilt,
      left + 4,
      507,
    ]);
    polygon(ctx, gate.open ? palette.face : "#615246", [
      left - 1,
      504,
      right + 2,
      504 + tilt,
      right + 2,
      527 + tilt,
      left - 1,
      527,
    ]);
    polygon(ctx, dark, [
      left - 1,
      526,
      right + 2,
      526 + tilt,
      right + 6,
      530 + tilt,
      left + 3,
      530,
    ]);
    const pulse = pulses[index];
    if (gate.open) {
      if (gate.barricadeId) {
        const slot = barrierIndex(state, gate.barricadeId);
        const opened = state.barricadeFlashes[slot];
        if (opened > 0) {
          ctx.globalAlpha = opened * 1.18;
          ctx.fillStyle = palette.light;
          ctx.fillRect(left + 3, 509, width - 5, 16);
          ctx.fillRect(left + 7, 535, 3, 24);
          ctx.fillRect(right - 7, 535, 3, 24);
        }
      }
      ctx.globalAlpha = 0.4 + pulse * 0.6;
      ctx.fillStyle = palette.glow;
      ctx.fillRect(left + 5, 526, width - 9, 2);
      ctx.globalAlpha = 1;
    } else {
      drawBarricade(gate, index, left, right);
    }
    label(
      gate.name,
      x + 1,
      523 + tilt * 0.5,
      index === 2 ? 23 : 22,
      gate.open ? "#ffffff" : "#f4d4a6",
      dark,
    );
  }

  function cannon() {
    const recoil = state.mode === "playing" ? state.recoil : 0;
    const x = state.gunX;
    ellipse(x + 5, 675, 36, 14, "#242a2e55");
    ctx.save();
    ctx.translate(x, 653 + recoil * 4);
    polygon(ctx, "#37526b", [-23, -4, 19, -12, 30, 17, -19, 25]);
    polygon(ctx, "#6683a0", [-23, -4, 19, -12, 21, 13, -18, 20]);
    for (let side = -1; side <= 1; side += 2) {
      ellipse(side * 23, 15, 10.5, 14, "#303340");
      ellipse(side * 25, 16, 7.5, 10, "#677482");
      ellipse(side * 25, 16, 3.6, 5, "#343e4d");
    }
    polygon(ctx, "#2f4a63", [-17, 9, -13, -43, 9, -47, 16, 5, 8, 15]);
    polygon(ctx, "#739cb8", [-16, 5, -12, -45, 8, -47, 12, 4, 4, 10]);
    polygon(ctx, "#b8d3dd", [-13, 0, -10, -43, -2, -45, -3, 6]);
    ellipse(-1, -44, 13.2, 6.2, "#7b9eb1");
    ellipse(-1, -45, 8.8, 4.2, "#283748");
    ellipse(-1, -46, 5.1, 2.4, "#172437");
    if (recoil > 0.68) {
      const flare = (recoil - 0.68) * 27;
      polygon(ctx, "#e4f9fbdc", [
        -2,
        -46 - flare * 1.8,
        2,
        -48 - flare * 0.78,
        4 + flare,
        -49,
        3,
        -45,
        -4,
        -44,
        -6 - flare,
        -48,
      ]);
    }
    ctx.restore();
  }

  function supplyFlags() {
    const y = state.level.objective.reinforcementCutoff;
    const color = state.redEntryOpen ? "#a5323c" : "#327cbf";
    for (let side = -1; side <= 1; side += 2) {
      const x = 210 + side * 184;
      ctx.fillStyle = "#484641";
      ctx.fillRect(x - 1, y - 24, 2, 27);
      polygon(ctx, color, [
        x,
        y - 24,
        x - side * 13,
        y - 23,
        x - side * 10,
        y - 18,
        x - side * 13,
        y - 13,
        x,
        y - 14,
      ]);
    }
  }

  function brokenWood(gate, open = gate.open) {
    if (!gate.barricadeId || !open) return;
    const slot = barrierIndex(state, gate.barricadeId);
    const flash = state.barricadeFlashes[slot];
    if (!flash) return;
    const age = 1 - flash / 0.48;
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 11;
      ctx.save();
      ctx.translate(
        gate.x + x * (1 + age),
        state.level.barricades[slot].hitY +
          age * 23 - 4 * age * (1 - age) * (8 + i % 3 * 7),
      );
      ctx.rotate(age * (i - 2.8) * 0.82);
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = i % 2 ? "#b9824c" : "#d6a26b";
      ctx.fillRect(-4, -3, 8, 7 + (i % 4));
      ctx.restore();
    }
  }

  function drawVictory(progress, front) {
    const y = Math.max(30, front + 8);
    ctx.save();
    ctx.globalAlpha = clamp(progress * 2.6, 0, 1);
    ctx.strokeStyle = "#37546a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(210, y + 7);
    ctx.lineTo(210, y - 30);
    ctx.stroke();
    polygon(ctx, "#367fd3", [
      211,
      y - 31,
      240,
      y - 30,
      233,
      y - 21,
      240,
      y - 14,
      211,
      y - 15,
    ]);
    ctx.globalAlpha *= 1 - progress * 0.6;
    for (let i = 0; i < 14; i++) {
      const x = 210 + Math.cos(i * 2.4) * progress * (24 + i * 5);
      const markY = y + Math.sin(i * 2.4) * progress * 45 - (i % 4) * 5;
      ctx.fillStyle = i % 2 ? "#fff1ac" : "#bdeaff";
      ctx.fillRect(x, markY, 2.5, 4);
    }
    ctx.restore();
  }

  function contactEffects() {
    const contact = motion.contact;
    const strike = state.t - contact.foughtAt;
    const isContact = contact.foughtAt >= 0 && strike < 0.13;
    if (isContact) {
      ctx.save();
      ctx.globalAlpha =
        (1 - strike / 0.13) * (contact.blue + contact.red) * 0.4;
      ctx.fillStyle = "#ffebc5";
      const half = laneHalfWidth(state.front) * 0.65;
      const x = 210 + Math.sin(contact.foughtAt * 13) * half;
      for (let i = -1; i <= 1; i++) {
        const spread = i * (5 + strike * 45);
        ctx.fillRect(x + spread, state.front - i * 4 - strike * 22, 2.4, 3.6);
      }
      ctx.restore();
    }

    const joined = Math.max(motion.arrivals[1], motion.arrivals[2]);
    const age = state.t - joined;
    if (!state.redTotal || age > 0.3) return;
    ctx.save();
    ctx.globalAlpha = (1 - age / 0.3) * 0.42;
    ctx.strokeStyle = "#b7e8ff";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const half = laneHalfWidth(state.front) * (0.32 + age * 1.1);
    ctx.moveTo(210 - half, state.front + 12 + age * 23);
    ctx.quadraticCurveTo(
      210,
      state.front + 3 + age * 23,
      210 + half,
      state.front + 12 + age * 23,
    );
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (terrain?.width) ctx.drawImage(terrain, 0, 0, W, H);
    else drawTerrain(ctx, state.level.objective.reinforcementCutoff);
    const celebration =
      state.victoryElapsed / state.level.combat.victoryDuration;
    const surge = 1 - (1 - celebration) ** 2;
    const clock = state.t + state.victoryElapsed;
    const emplacement = state.level.support;
    const archerSupport = emplacement?.kind === "archers";
    const impactAge = clock - motion.impact.at;
    figures.setClock(clock);
    for (const gate of state.gates) {
      const duration = waveProfile(gate.mult).flare;
      pulses[gate.style] =
        state.mode === "playing"
          ? clamp(1 - (state.t - motion.pulses[gate.style]) / duration, 0, 1)
          : 0;
      gateGround(gate, gate.style);
    }
    if (state.mode === "playing") drawImpactGround(ctx, motion.impact, impactAge);
    const flights = state.mode === "playing" ? motion.airborne : null;
    figures.redArmy(state, motion.contact, motion.impact, flights?.slots[1]);
    figures.blueArmy(state, surge, motion.contact, motion.tails, motion.impact, flights?.slots[0]);
    if (flights) {
      drawImpactBurst(ctx, motion.impact, impactAge);
      figures.airborne(flights.active);
      if (archerSupport)
        drawArcherVolley(ctx, clock, motion.archers.launch, motion.archers.impact);
    }
    for (const gate of state.gates) drawGate(gate, gate.style);
    if (emplacement) {
      if (archerSupport) {
        drawArcherCrew(ctx, state, figures, motion.archers.launch, clock);
        label("MEOWMEN", emplacement.x, emplacement.y - 46, 11, "#d9f5ff");
      } else {
        drawCatapult(ctx, state, figures);
        label("PURRAPULT", emplacement.x, emplacement.y - 45, 10, "#ffe7ce");
      }
      if (!state.support.open) {
        drawBarricade(
          emplacement,
          3,
          emplacement.x - emplacement.width / 2,
          emplacement.x + emplacement.width / 2,
        );
      }
    }
    supplyFlags();
    if (state.mode === "playing") figures.fallen(motion.falls);
    if (state.mode === "playing") {
      contactEffects();
      for (const gate of state.gates) brokenWood(gate);
      if (emplacement) brokenWood(emplacement, state.support.open);
      for (const shot of state.shots) figures.projectile(shot);
      for (const b of state.burst) {
        const wood = b.color === "#d48b4b" || b.color === "#e9b779";
        ctx.globalAlpha = clamp(b.life * 3, 0, 0.9);
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, wood ? 4.5 : 2.6, wood ? 2.2 : 2.6);
      }
      ctx.globalAlpha = 1;
    }
    cannon();
    if (emplacement && !archerSupport && state.mode === "playing")
      drawArtilleryShot(ctx, state);
    if (celebration > 0.54) {
      const front = state.front - victoryAdvance(
        state.front, state.victoryElapsed, state.level.combat.victoryDuration,
      );
      drawVictory(smoothStep((celebration - 0.54) / 0.46), front);
    }
  }

  return {
    draw,
    resize() {
      const pixel = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * pixel);
      canvas.height = Math.floor(H * pixel);
      ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
      if (terrain) {
        terrain.width = canvas.width;
        terrain.height = canvas.height;
        const background = terrain.getContext("2d");
        background.setTransform(pixel, 0, 0, pixel, 0, 0);
        drawTerrain(background, state.level.objective.reinforcementCutoff);
      }
      draw();
    },
  };
}
