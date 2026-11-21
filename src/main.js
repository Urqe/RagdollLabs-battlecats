import { createGame } from "./game.js";
import { createRenderer } from "./render.js";
import { createMotion } from "./motion.js";
import { createSound } from "./sound.js";
import { bindControls } from "./controls.js";
import { barrierStatus } from "./barricades.js";
const el = (id) => document.getElementById(id),
  canvas = el("game");
const sound = createSound();
const motion = createMotion(() => sound.play("reversal"));
const game = createGame({ notify, onEnd: end, onEffect }),
  state = game.state;
const renderer = createRenderer(state, canvas, motion);
const soundButtons = document.querySelectorAll("[data-sound]");

function onEffect(kind, time, value, front, redLoss, blueLoss) {
  motion.receive(kind, time, value, front, redLoss, blueLoss);
  if (kind === "arrival") return;
  sound.play(kind === "multiply" ? `gate${value}` : kind);
}

function updateSoundButtons() {
  for (const button of soundButtons) {
    button.setAttribute("aria-pressed", String(sound.enabled));
    button.textContent = sound.enabled ? "Sound on" : "Sound off";
  }
}
for (const button of soundButtons) {
  button.addEventListener("click", () => {
    void sound.setEnabled(!sound.enabled);
    updateSoundButtons();
  });
}
updateSoundButtons();
function notify(s, seconds = 2) {
  state.bannerUntil = state.t + seconds;
  el("banner").textContent = s;
  el("banner").style.opacity = 1;
}
function end(won) {
  el("result").classList.toggle("won", won);
  el("result").hidden = false;
  el("hud").style.display = "none";
  el("banner").style.opacity = 0;
  el("resultEmoji").textContent = won ? "🏆" : "😿";
  el("resultTitle").textContent = won
    ? "The castle stands!"
    : "The horde broke through";
  el("resultText").textContent = won
    ? "Your cat army overwhelmed the invaders and cleared the battlefield. The Last Stand is won!"
    : "The enemy reached your castle before you could turn the tide. Reinforce the frontline between volleys at the barricades.";
}

let frame = null,
  last = 0;
function reset() {
  if (frame !== null) cancelAnimationFrame(frame);
  void sound.unlock();
  motion.reset();
  game.reset();
  el("menu").hidden = true;
  el("result").hidden = true;
  el("hud").style.display = "flex";
  updateHud();
  last = performance.now();
  frame = requestAnimationFrame(loop);
}
function updateHud() {
  if (state.t > state.bannerUntil) el("banner").style.opacity = 0;
  const marching = state.squads.reduce((n, q) => n + q.count, 0);
  el("blueCount").textContent = Math.floor(
    state.blueTotal + marching,
  ).toLocaleString("en-US");
  el("redCount").textContent = Math.ceil(state.redTotal).toLocaleString(
    "en-US",
  );
  el("gate99").textContent = barrierStatus(state, 0).label;
  el("gate999").textContent = barrierStatus(state, 1).label;
}
function loop(now) {
  frame = null;
  const dt = Math.min((now - last) / 1000, 0.045);
  last = now;
  const wasPlaying = state.mode === "playing";
  const previousFront = state.front;
  const previousTime = state.t;
  game.update(dt);
  if (state.t > previousTime) {
    motion.step(
      state.t,
      (state.front - previousFront) / (state.t - previousTime),
      state.blueTotal,
      state.redEntryOpen,
    );
  }
  if (wasPlaying && state.mode === "victory") el("banner").style.opacity = 0;
  if (state.mode === "playing" || state.mode === "victory") updateHud();
  renderer.draw();
  if (state.mode === "playing" || state.mode === "victory") {
    frame = requestAnimationFrame(loop);
  }
}
bindControls(state, canvas, document);
el("play").addEventListener("click", reset);
el("replay").addEventListener("click", reset);
addEventListener("resize", renderer.resize);
renderer.resize();

// Read-only inspection for debugging and browser regression tests; no test-only
// controls or state setters are installed in the running game.
export function getSnapshot() {
  return structuredClone(state);
}
