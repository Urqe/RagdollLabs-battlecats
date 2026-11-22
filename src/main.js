import { createBattleClock, createGame } from "./game.js";
import { createRenderer } from "./render.js";
import { createMotion } from "./motion.js";
import { createSound } from "./sound.js";
import { bindControls } from "./controls.js";
import { barrierStatus } from "./barricades.js";
import { LEVELS, playableLevel } from "./levels.js";
import { readProgress, saveProgress } from "./progress.js";

const el = (id) => document.getElementById(id);
const canvas = el("game");
const progress = readProgress();
const sound = createSound();
const motion = createMotion(() => sound.play("reversal"));
const game = createGame({
  level: playableLevel(progress.selected),
  notify,
  onEnd: end,
  onEffect,
});
const state = game.state;
const renderer = createRenderer(state, canvas, motion);
const soundButtons = document.querySelectorAll("[data-sound]");
let frame = null;
let last = 0;
let barrierLabels = [];

function onEffect(kind, time, value, front, redLoss, blueLoss) {
  motion.receive(kind, time, value, front, redLoss, blueLoss);
  if (kind === "victory") {
    if (!progress.completed.includes(state.level.id)) {
      progress.completed.push(state.level.id);
      saveProgress(progress);
    }
    return;
  }
  if (kind === "arrival") return;
  if (kind === "multiply") sound.play(`gate${value}`);
  else if (kind === "break")
    sound.play(value === "catapult" ? "artilleryReady" : "gateUnlock");
  else sound.play(kind === "flagCapture" ? "victory" : kind);
}

function updateSoundButtons() {
  for (const button of soundButtons) {
    button.setAttribute("aria-pressed", String(sound.enabled));
    button.textContent = sound.enabled ? "Sound on" : "Sound off";
  }
}

function notify(message, seconds = 2) {
  state.bannerUntil = state.t + seconds;
  el("banner").textContent = message;
  el("banner").style.opacity = 1;
}

function end(won) {
  const { level } = state;
  el("result").classList.toggle("won", won);
  el("result").hidden = false;
  el("battleNav").hidden = true;
  el("hud").style.display = "none";
  el("banner").style.opacity = 0;
  el("danger").hidden = true;
  el("resultEmoji").textContent = won ? "🏆" : "😿";
  el("resultTitle").textContent = won
    ? "The castle stands!"
    : "The horde broke through";
  el("resultText").textContent = won
    ? `Your cat army overwhelmed the invaders and cleared the battlefield. ${level.title} is won!`
    : "The enemy reached your castle before you could turn the tide. Reinforce the frontline between volleys at the barricades.";
  el("resultLevel").textContent = `Level ${level.number} · ${level.title}`;
}

function stopFrame() {
  el("danger").hidden = true;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function buildBarrierHud() {
  const area = el("barrierHud");
  area.replaceChildren();
  barrierLabels = [];
  for (const gate of state.gates) {
    if (!gate.barricadeId) continue;
    const slot = state.level.barricades.findIndex(
      ({ id }) => id === gate.barricadeId,
    );
    const field = document.createElement("div");
    field.className = "stat";
    field.textContent = `${gate.name} BARRIER`;
    const value = document.createElement("b");
    value.id = `gate${gate.mult}`;
    field.append(value);
    area.append(field);
    barrierLabels.push({ slot, value });
  }
}

function start(level = playableLevel(progress.selected)) {
  stopFrame();
  void sound.unlock();
  progress.selected = level.id;
  saveProgress(progress);
  const changed = state.level !== level;
  motion.reset();
  game.reset(level);
  motion.step(0, 0, state.blueTotal, state.redEntryOpen, level, state);
  if (changed) renderer.resize();
  el("menu").hidden = true;
  el("levels").hidden = true;
  el("result").hidden = true;
  el("battleNav").hidden = false;
  el("hud").style.display = "flex";
  buildBarrierHud();
  updateHud();
  battleClock.reset();
  last = performance.now();
  frame = requestAnimationFrame(loop);
}

function showMenu() {
  const level = playableLevel(progress.selected);
  el("menuLevel").textContent = `Level ${level.number} · ${level.title}`;
  const supportTip = el("artilleryTip");
  supportTip.hidden = !level.support;
  supportTip.textContent = level.support?.kind === "archers"
    ? "Break the Meowmen barricade on the far left to unlock automatic arrow volleys."
    : "Break the Purrapult barricade to add automatic yarn artillery.";
  el("levels").hidden = true;
  el("menu").hidden = false;
}

function chooseLevel() {
  stopFrame();
  motion.reset();
  game.reset(state.level, "menu");
  el("hud").style.display = "none";
  el("banner").style.opacity = 0;
  el("battleNav").hidden = true;
  el("menu").hidden = true;
  el("result").hidden = true;
  const grid = el("levelGrid");
  grid.replaceChildren();
  for (const level of LEVELS) {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = "level-choice";
    entry.dataset.level = level.id;
    entry.disabled = level.status !== "implemented";
    const number = document.createElement("span");
    number.textContent = `Level ${level.number}`;
    const title = document.createElement("strong");
    title.textContent = level.title;
    const status = document.createElement("span");
    const completed = progress.completed.includes(level.id);
    status.textContent = entry.disabled
      ? "Coming soon"
      : completed
        ? "Completed · Play"
        : "Play";
    status.classList.toggle("completed", completed);
    entry.append(number, title, status);
    if (!entry.disabled) entry.addEventListener("click", () => start(level));
    grid.append(entry);
  }
  el("levels").hidden = false;
  renderer.draw();
}

function updateHud() {
  if (state.t > state.bannerUntil) el("banner").style.opacity = 0;
  const warning = el("danger");
  const { danger } = state;
  const showing = state.mode === "playing" && state.t < danger.flashUntil;
  warning.hidden = !showing;
  if (showing) {
    const target = danger.gate ? ` · AIM AT ×${danger.gate}` : "";
    const message = (danger.level === "critical"
      ? "REINFORCEMENTS NEEDED!"
      : "FRONTLINE UNDER PRESSURE!") + target;
    warning.dataset.level = danger.level;
    if (warning.textContent !== message) warning.textContent = message;
  }
  const marching = state.squads.reduce((n, q) => n + q.count, 0);
  el("blueCount").textContent = Math.floor(
    state.blueTotal + marching,
  ).toLocaleString("en-US");
  el("redCount").textContent = Math.ceil(state.redTotal).toLocaleString(
    "en-US",
  );
  for (const { slot, value } of barrierLabels) {
    const label = barrierStatus(state, slot).label;
    if (value.textContent !== label) value.textContent = label;
  }
}

const battleClock = createBattleClock((dt) => {
  const previousFront = state.front;
  const previousTime = state.t;
  const previousPresentation = state.t + state.victoryElapsed;
  game.update(dt);
  const presentationTime = state.t + state.victoryElapsed;
  if (presentationTime > previousPresentation) {
    motion.step(
      presentationTime,
      state.t > previousTime ? (state.front - previousFront) / (state.t - previousTime) : 0,
      state.blueTotal,
      state.redEntryOpen,
      state.level,
      state,
    );
  }
});

function loop(now) {
  frame = null;
  const wasPlaying = state.mode === "playing";
  battleClock.advance((now - last) / 1000);
  last = now;
  if (wasPlaying && state.mode === "victory") el("banner").style.opacity = 0;
  if (state.mode === "playing" || state.mode === "victory") updateHud();
  renderer.draw();
  if (state.mode === "playing" || state.mode === "victory")
    frame = requestAnimationFrame(loop);
}

for (const button of soundButtons) {
  button.addEventListener("click", () => {
    void sound.setEnabled(!sound.enabled);
    updateSoundButtons();
  });
}
updateSoundButtons();
bindControls(state, canvas, document);
el("play").addEventListener("click", () => start());
el("replay").addEventListener("click", () => start(state.level));
for (const id of ["chooseLevel", "battleLevels", "resultLevels"]) {
  el(id).addEventListener("click", chooseLevel);
}
el("levelsBack").addEventListener("click", showMenu);
addEventListener("resize", renderer.resize);
showMenu();
renderer.resize();

export function getSnapshot() {
  return structuredClone(state);
}
