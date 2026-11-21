import { W, H, TAU, clamp, LEVEL } from "./config.js";
import { barrierStatus } from "./barricades.js";
export function createRenderer(state, canvas) {
  const ctx = canvas.getContext("2d");
  function mapY(y) {
    return y;
  } // battlefield projection is applied in path geometry and perspective scaling
  function landscape() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#a8b9ab");
    g.addColorStop(1, "#c8c7bd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Perspective stone roadway: narrows toward the enemy horizon.
    const roadX = (y) => 52 - 36 * (1 - y / H),
      rightX = (y) => W - roadX(y);
    ctx.beginPath();
    ctx.moveTo(85, 0);
    ctx.lineTo(335, 0);
    ctx.lineTo(408, H);
    ctx.lineTo(12, H);
    ctx.closePath();
    ctx.fillStyle = "#b9bab3";
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(85, 0);
    ctx.lineTo(335, 0);
    ctx.lineTo(408, H);
    ctx.lineTo(12, H);
    ctx.closePath();
    ctx.clip();
    for (let y = 20; y < H; y += 30 + y * 0.016) {
      ctx.strokeStyle = "#f5f2e752";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      const step = 28 + y * 0.028,
        offset = ((Math.floor(y / 40) % 2) * step) / 2;
      for (let x = offset; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 4, y + 31);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Green banks and grey walls frame a narrow corridor near the horizon.
    for (let side = 0; side < 2; side++) {
      ctx.save();
      if (side) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(122, 0);
      ctx.lineTo(119, 85);
      ctx.lineTo(145, 140);
      ctx.lineTo(144, 218);
      ctx.lineTo(88, 350);
      ctx.lineTo(28, 470);
      ctx.lineTo(0, 510);
      ctx.closePath();
      ctx.fillStyle = "#426e50";
      ctx.fill();
      for (let i = 0; i < 34; i++) {
        let x = (i * 47) % 125,
          y = (i * 67) % 335;
        ctx.fillStyle = i % 2 ? "#598b59" : "#3b7448";
        ctx.beginPath();
        ctx.arc(x, y, 12 + (i % 4) * 4, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(125, 140);
      ctx.lineTo(155, 225);
      ctx.lineTo(101, 370);
      ctx.lineTo(38, 512);
      ctx.strokeStyle = "#64717a";
      ctx.lineWidth = 19;
      ctx.stroke();
      ctx.strokeStyle = "#a7acaf";
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.restore();
    }
    // Clear, physically legible funnel walls; soldiers can only travel through the middle gap.
    ctx.fillStyle = "#72797e";
    ctx.fillRect(90, 244, 93, 22);
    ctx.fillRect(237, 244, 93, 22);
    ctx.fillStyle = "#a7b0b5";
    ctx.fillRect(92, 244, 89, 9);
    ctx.fillRect(239, 244, 89, 9);
    for (let x = 94; x < 330; x += 17) {
      if (x > 175 && x < 244) continue;
      ctx.fillStyle = "#8b9499";
      ctx.fillRect(x, 235, 13, 14);
    }
    ctx.fillStyle = "#5b6469";
    ctx.fillRect(171, 235, 8, 31);
    ctx.fillRect(241, 235, 8, 31);
    // Lower castle wall.
    ctx.fillStyle = "#7d8a95";
    ctx.fillRect(15, 714, 390, 46);
    ctx.fillStyle = "#abb6bd";
    for (let x = 15; x < 405; x += 35) ctx.fillRect(x, 707, 24, 13);
  }
  function round(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  // Cache bounded, tiny vector sprites rather than redraw thousands of paths
  // per frame. Bobbing/formation movement stays continuous; size rounds to .1px.
  const sprites = new Map();
  function paintCat(target, color, size) {
    target.fillStyle = "#20282b55";
    target.beginPath();
    target.ellipse(1, size * 0.7, size * 0.75, size * 0.25, 0, 0, TAU);
    target.fill();
    target.fillStyle = color;
    target.beginPath();
    target.moveTo(-size * 0.77, -size * 0.31);
    target.lineTo(-size * 0.78, -size);
    target.lineTo(-size * 0.2, -size * 0.68);
    target.lineTo(size * 0.2, -size * 0.68);
    target.lineTo(size * 0.78, -size);
    target.lineTo(size * 0.77, -size * 0.31);
    target.arc(0, 0, size * 0.78, -0.4, Math.PI + 0.4);
    target.fill();
    target.beginPath();
    target.ellipse(0, size * 0.37, size * 0.73, size * 0.57, 0, 0, TAU);
    target.fill();
    target.fillStyle = "#172739";
    target.beginPath();
    target.arc(-size * 0.26, -size * 0.3, Math.max(0.55, size * 0.1), 0, TAU);
    target.arc(size * 0.26, -size * 0.3, Math.max(0.55, size * 0.1), 0, TAU);
    target.fill();
  }
  function cat(x, y, color, size, phase = 0) {
    ctx.save();
    ctx.translate(x, y + Math.sin(state.t * 7 + phase) * 1.1);
    if (canvas.ownerDocument) {
      const rounded = Math.round(size * 10) / 10,
        key = color + rounded;
      let sprite = sprites.get(key);
      if (!sprite) {
        sprite = canvas.ownerDocument.createElement("canvas");
        sprite.width = 48;
        sprite.height = 48;
        const target = sprite.getContext("2d");
        target.scale(2, 2);
        target.translate(12, 12);
        paintCat(target, color, rounded);
        sprites.set(key, sprite);
      }
      ctx.drawImage(sprite, -12, -12, 24, 24);
    } else paintCat(ctx, color, size);
    ctx.restore();
  }
  // Packed formation silhouettes: hundreds of visible cats, tens of thousands simulated logically.
  function army() {
    const redStrength = clamp(state.redTotal / LEVEL.initialRed, 0, 1);
    // An enormous enemy reserve approaches slowly through the stone funnel.
    const rows = state.redTotal > 0 ? Math.ceil(12 + redStrength * 34) : 0,
      cols = 30;
    for (let r = 0; r < rows; r++) {
      const y = state.front - r * 7;
      if (y < -15 || y > 705) continue;
      const half =
        y < 260
          ? clamp(29 + (260 - y) * 0.36, 30, 100)
          : clamp(38 + (y - 260) * 0.29, 38, 148);
      for (let c = 0; c < cols; c++) {
        if ((r * 11 + c * 7) % 31 > Math.floor(31 * redStrength)) continue;
        const x = 210 + ((c - 14.5) * half) / 14.5 + (r % 2 ? 2 : 0);
        cat(
          x,
          y,
          "#d8504d",
          clamp(3.6 + y * 0.004, 3.7, 6.2),
          r * 0.4 + c * 0.13,
        );
      }
    }
    // Blue cats actually march from the gate: each squad travels from y=540 to the frontline.
    for (const q of state.squads) {
      const show = Math.min(
        q.count,
        q.mult === 20 ? 60 : q.mult === 99 ? 90 : 75,
      );
      const cols = Math.min(15, Math.ceil(Math.sqrt(show * 1.35)));
      const rows = Math.ceil(show / cols),
        spacing = clamp(7.5 + q.y * 0.004, 8, 10);
      const cx = q.x + (210 - q.x) * clamp((555 - q.y) / 330, 0, 1);
      for (let i = 0; i < show; i++) {
        const row = Math.floor(i / cols),
          col = i % cols;
        const xx = cx + (col - (cols - 1) / 2) * spacing;
        const yy = q.y + row * spacing * 0.75;
        cat(
          xx,
          yy,
          "#379aff",
          clamp(4 + yy * 0.004, 4.5, 6.8),
          q.phase + i * 0.25,
        );
      }
      if (q.count > show) {
        round(cx - 22, q.y + rows * spacing * 0.75 + 3, 44, 17, 5, "#183f72d9");
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 11px system-ui";
        ctx.fillText(
          "×" + Math.round(q.count / show),
          cx,
          q.y + rows * spacing * 0.75 + 15,
        );
      }
    }
    // All troops reaching the front become a persistent formation that fights the horde.
    const count = Math.min(300, Math.floor(state.blueTotal / 28)),
      colsBlue = 24;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / colsBlue),
        col = i % colsBlue,
        y = state.front + 11 + row * 8;
      if (y > 670) continue;
      const half = clamp(35 + (y - 200) * 0.21, 42, 125);
      cat(
        210 + ((col - 11.5) * half) / 11.5,
        y,
        "#379aff",
        clamp(4 + y * 0.005, 4.5, 7),
        i * 0.37,
      );
    }
  }
  function drawBarricade(g, i) {
    const xx = g.x - g.width / 2,
      y = g.y - 28;
    const { progress, label } = barrierStatus(state, i);
    round(xx, y, g.width, 30, 5, "#54412f");
    for (let k = 0; k < 5; k++) {
      const bx = xx + (k * g.width) / 5 + 2;
      round(bx, y + 2, g.width / 5 - 4, 25, 2, k % 2 ? "#a2784b" : "#c18d53");
      if (progress > 0.1 && k % 3 === 0) {
        ctx.strokeStyle = "#533b2c";
        ctx.beginPath();
        ctx.moveTo(bx + 2, y + 3);
        ctx.lineTo(bx + 11 + progress * 5, y + 17);
        ctx.stroke();
      }
    }
    round(xx + 5, y + 33, g.width - 10, 7, 2, "#1f3041");
    round(xx + 5, y + 33, (g.width - 10) * progress, 7, 2, "#ffd276");
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#273440";
    ctx.font = "900 15px system-ui";
    ctx.strokeText(label, g.x, y - 9);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, g.x, y - 9);
    ctx.font = "bold 10px system-ui";
    ctx.fillStyle = "#fff3cf";
    ctx.fillText("SHOOT TO BREAK", g.x, y + 52);
    if (state.barricadeFlashes[i] > 0) {
      ctx.fillStyle =
        "rgba(255,233,134," +
        Math.min(0.68, state.barricadeFlashes[i] * 2) +
        ")";
      ctx.fillRect(xx, y, g.width, 30);
    }
  }
  function drawGate(g, i) {
    const x = g.x - g.width / 2,
      y = g.y;
    if (!g.open) {
      drawBarricade(g, i - 1);
      return;
    }
    ctx.save();
    ctx.shadowColor = g.color;
    ctx.shadowBlur = 18;
    round(x, y, g.width, 34, 5, g.color);
    ctx.restore();
    ctx.strokeStyle = "#e2f6ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, g.width - 6, 28);
    ctx.font = "900 24px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#172c49";
    ctx.lineWidth = 4;
    ctx.strokeText(g.name, g.x, y + 17);
    ctx.fillStyle = "#fff";
    ctx.fillText(g.name, g.x, y + 17);
  }
  function drawCannon() {
    ctx.save();
    ctx.translate(state.gunX, 665);
    ctx.fillStyle = "#0005";
    ctx.beginPath();
    ctx.ellipse(1, 31, 32, 11, 0, 0, TAU);
    ctx.fill();
    round(-28, 9, 15, 24, 5, "#25394d");
    round(13, 9, 15, 24, 5, "#25394d");
    round(-23, 2, 46, 24, 7, "#456d9a");
    round(-18, -8, 36, 22, 7, "#7e9abb");
    ctx.save();
    ctx.rotate(Math.sin(state.t * 8) * 0.01);
    round(-14, -49, 28, 62, 11, "#3b628a");
    round(-10, -52, 20, 53, 9, "#bfd0db");
    round(-12, -59, 24, 12, 6, "#355a80");
    ctx.fillStyle = "#14283a";
    ctx.beginPath();
    ctx.ellipse(0, -53, 8, 3.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    round(-9, 7, 18, 10, 4, "#c4d5dc");
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    landscape();
    // The colored seam marks where arrived blue formations meet the horde.
    ctx.strokeStyle = "#ffe8a4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(165, state.front + 6);
    ctx.lineTo(255, state.front + 6);
    ctx.stroke();
    army();
    // Three gates, two barricades visible at once; one live gate initially.
    for (let i = 0; i < state.gates.length; i++) drawGate(state.gates[i], i);
    for (const s of state.shots) {
      cat(s.x, s.y, "#8ad7ff", 7, state.t * 4 + s.x);
    }
    for (const b of state.burst) {
      ctx.globalAlpha = clamp(b.life * 3, 0, 1);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, 3.5, 3.5);
    }
    ctx.globalAlpha = 1;
    drawCannon();
    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255,94,68," + state.flash * 0.15 + ")";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.textAlign = "center";
    ctx.font = "900 12px system-ui";
    ctx.fillStyle = "#f9fbff";
    ctx.shadowColor = "#0d2437";
    ctx.shadowBlur = 5;
    ctx.fillText("◀ SLIDE CANNON LEFT / RIGHT ▶", 210, 751);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  return {
    draw,
    resize() {
      const pixel = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * pixel);
      canvas.height = Math.floor(H * pixel);
      ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
      draw();
    },
  };
}
