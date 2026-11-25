import { barrierIndex, barrierStatus } from "./barricades.js";
import { H, W } from "./config.js";
import { createConnectedPresentation } from "./connected-render.js";
import { createFigures } from "./figures.js";
import { drawCannon } from "./render.js";

const blue = "#79d9ff";
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

export function createDualRenderer(state, canvas, battle) {
  const ctx = canvas.getContext("2d");
  const background = canvas.ownerDocument.createElement("canvas");
  const figures = createFigures(ctx, canvas.ownerDocument);
  const connected = createConnectedPresentation(ctx, figures, state, battle);

  function drawGate(gate) {
    const { x, hitY, width } = gate;
    const left = x - width / 2;
    const phalanx = gate.mult === null;
    const color = gate.mult === 5 ? blue : gate.mult === 100 ? "#ffdb91" : amber;
    const lit = state.mode === "playing" && state.t - gate.flashAt < 0.13;
    rect(ctx, "#302f30", left, hitY - 37, width, 46);
    const fill = lit ? (gate.mult === 100 ? "#87d5ed" : "#568aa1") : "#4b5960";
    rect(ctx, fill, left + 4, hitY - 15, width - 8, 23);
    rect(ctx, color, left, hitY - 37, width, 3);
    rect(ctx, color, left, hitY - 14, 4, 20);
    rect(ctx, color, left + width - 4, hitY - 14, 4, 20);
    rect(ctx, gate.open ? color : "#817063", left, hitY, width, 2);
    text(ctx, phalanx ? "PHALANX" : `×${gate.mult}`, x, hitY - 19, phalanx ? 9 : 17, color);
    const redirects = gate.laneId === "left" && battle.state.phalanx.phase === "secured";
    if (!gate.barricadeId) {
      if (redirects) text(ctx, "→ EAST", x, hitY + 26, 9, amber);
      return;
    }
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
      text(ctx, phalanx ? (redirects ? "SECURED" : "RELEASED") : redirects ? "→ EAST" : "OPEN", x, hitY + 26, 9, amber);
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
    const started = performance.now();
    ctx.drawImage(background, 0, 0, W, H);
    if (!battle.state.lanes) return;
    figures.setClock(state.t + state.victoryElapsed);
    connected.draw();
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
        const tint = target ? (target.mult === 5 ? "#79d9ff" : amber) : "#c1b99c";
        for (let dot = state.level.battlefield.shotY - 7; dot >= y; dot -= 7)
          rect(ctx, tint, x - 0.5, dot, 1.5, 3);
      }
      for (const shot of state.shots) figures.projectile(shot);
    }
    drawCannon(ctx, state);
    connected.recordDraw(performance.now() - started);
  }

  return {
    draw,
    reset: connected.reset,
    receive: connected.receive,
    snapshot: connected.snapshot,
    frame: connected.frame,
    resize() {
      const pixel = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = background.width = Math.floor(W * pixel);
      canvas.height = background.height = Math.floor(H * pixel);
      ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
      const ground = background.getContext("2d");
      ground.setTransform(pixel, 0, 0, pixel, 0, 0);
      connected.terrain(ground);
      draw();
    },
  };
}
