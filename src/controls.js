import { W, clamp } from "./config.js";
export function bindControls(state, canvas, document) {
  function moveMouse(x) {
    const r = canvas.getBoundingClientRect();
    state.gunX = clamp(((x - r.left) / r.width) * W, 45, 375);
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (
      state.mode !== "playing" ||
      state.dragId !== null ||
      e.pointerType === "mouse"
    )
      return;
    state.dragId = e.pointerId;
    state.dragStart = e.clientX;
    state.gunStart = state.gunX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (state.mode !== "playing") return;
    if (e.pointerType === "mouse") {
      moveMouse(e.clientX);
      return;
    }
    if (e.pointerId === state.dragId) {
      const r = canvas.getBoundingClientRect();
      state.gunX = clamp(
        state.gunStart + ((e.clientX - state.dragStart) / r.width) * W,
        45,
        375,
      );
    }
  });
  function release(e) {
    if (e.pointerId === state.dragId) state.dragId = null;
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  document.addEventListener("keydown", (e) => {
    if (state.mode !== "playing") return;
    if (["ArrowLeft", "a", "A"].includes(e.key))
      state.gunX = clamp(state.gunX - 23, 45, 375);
    if (["ArrowRight", "d", "D"].includes(e.key))
      state.gunX = clamp(state.gunX + 23, 45, 375);
  });
}
