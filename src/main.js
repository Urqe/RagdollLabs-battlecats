import { createBattleClock, createGame } from "./game.js";
import { createRenderer } from "./render.js";
import { createDualBattlefield, fixtureLevel } from "./dual-battlefield.js";
import { createDualRenderer } from "./dual-render.js";
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
const fixtureRequested = new URLSearchParams(location.search).get("fixture") === "dual-crossing";
const fixture = fixtureRequested ? createDualBattlefield({
  state, onEnd: end,
  onEffect(kind, _time, value) {
    if (kind === "multiply") sound.play(value === 20 ? "gate20" : "gate99");
    else if (kind === "break") sound.play("gateUnlock");
    else sound.play(kind);
  },
}) : null;
const fixtureRenderer = fixture && createDualRenderer(state, canvas, fixture);
const inFixture = () => state.level === fixtureLevel;
const activeRenderer = () => inFixture() ? fixtureRenderer : renderer;
const activeClock = () => inFixture() ? fixture : battleClock;
const soundButtons = document.querySelectorAll("[data-sound]");
let frame = null;
let last = null;
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
    ? (inFixture() ? "Both enemy supply routes are secured and the crossings are clear."
      : `Your cat army overwhelmed the invaders and cleared the battlefield. ${level.title} is won!`)
    : inFixture() ? `The ${fixture.state.lanes.left.breached ? "west" : "east"} crossing fell. Keep both crossings reinforced to hold the castle.`
    : "The enemy reached your castle before you could turn the tide. Reinforce the frontline between volleys at the barricades.";
  el("resultLevel").textContent = `Level ${level.number} · ${level.title}`;
}

function stopFrame() {
  el("danger").hidden = true;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function battleActive() {
  return state.mode === "playing" || state.mode === "victory";
}

function pause() {
  if (!battleActive() || activeClock().paused) return;
  activeClock().pause();
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  last = null;
  if (state.dragId !== null) {
    const pointer = state.dragId;
    state.dragId = null;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  }
  sound.suspend();
  el("battleNav").inert = true;
  el("pauseOverlay").hidden = false;
  el("resumeBattle").focus({ preventScroll: true });
}

function clearPause() {
  el("pauseOverlay").hidden = true;
  el("battleNav").inert = false;
}

function resume() {
  if (!activeClock().paused || !battleActive() || document.hidden) return;
  activeClock().resume();
  clearPause();
  el("pauseBattle").focus({ preventScroll: true });
  void sound.unlock();
  frame = requestAnimationFrame(loop);
}

function resetPause() {
  if (activeClock().paused) sound.discard();
  clearPause();
  battleClock.reset();
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
  resetPause();
  void sound.unlock();
  const changed = state.level !== level;
  motion.reset();
  if (level === fixtureLevel) {
    fixture.reset();
  } else {
    if (inFixture()) fixture.clear();
    progress.selected = level.id;
    saveProgress(progress);
    game.reset(level);
    motion.step(0, 0, state.blueTotal, state.redEntryOpen, level, state);
  }
  if (changed) activeRenderer().resize();
  el("menu").hidden = true;
  el("levels").hidden = true;
  el("result").hidden = true;
  el("battleNav").hidden = false;
  el("hud").style.display = inFixture() ? "none" : "flex";
  if (!inFixture()) {
    buildBarrierHud();
    updateHud();
  }
  activeRenderer().draw();
  last = performance.now();
  if (document.hidden) pause();
  else frame = requestAnimationFrame(loop);
}

function showMenu() {
  const level = fixtureRequested ? fixtureLevel : playableLevel(progress.selected);
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
  resetPause();
  motion.reset();
  if (inFixture()) {
    fixture.clear();
    game.reset(playableLevel(progress.selected), "menu");
    renderer.resize();
  } else game.reset(state.level, "menu");
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
  if (document.hidden) pause();
  if (activeClock().paused) return;
  const wasPlaying = state.mode === "playing";
  // The first frame after resuming establishes a fresh wall-clock baseline.
  if (last !== null) activeClock().advance((now - last) / 1000);
  last = now;
  if (wasPlaying && state.mode === "victory") el("banner").style.opacity = 0;
  if (battleActive() && !inFixture()) updateHud();
  activeRenderer().draw();
  if (battleActive())
    frame = requestAnimationFrame(loop);
}

for (const button of soundButtons) {
  button.addEventListener("click", () => {
    void sound.setEnabled(!sound.enabled);
    updateSoundButtons();
  });
}
updateSoundButtons();
bindControls(state, canvas, document, () => activeClock().paused || document.hidden);
el("pauseBattle").addEventListener("click", pause);
el("resumeBattle").addEventListener("click", resume);
el("restartBattle").addEventListener("click", () => start(state.level));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
addEventListener("pagehide", pause);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !battleActive()) return;
  event.preventDefault();
  if (event.repeat) return;
  if (activeClock().paused) resume();
  else pause();
});
el("play").addEventListener("click", () => start(fixtureRequested ? fixtureLevel : undefined));
el("replay").addEventListener("click", () => start(state.level));
for (const id of ["chooseLevel", "battleLevels", "pausedLevels", "resultLevels"]) {
  el(id).addEventListener("click", chooseLevel);
}
el("levelsBack").addEventListener("click", showMenu);
addEventListener("resize", () => activeRenderer().resize());
if (fixtureRequested) {
  const description = el("menuLevel").parentElement;
  description.replaceChildren(el("menuLevel"), document.createElement("br"), "Development fixture");
  const supportTip = el("artilleryTip");
  supportTip.parentElement.replaceChildren(supportTip,
    "Slide the cannon to reinforce either bridge. Amber gates unlock after you break their barricades. Hold both crossings and cut both red supply routes.");
}
showMenu();
renderer.resize();

export function getSnapshot() {
  if (!inFixture()) return structuredClone(state);
  const feedback = Object.fromEntries(Object.entries(fixture.feedback).map(
    ([id, { flights, ...local }]) => [id, { ...local, airborne: flights.active }],
  ));
  return structuredClone({ ...state, dual: fixture.state, feedback });
}
