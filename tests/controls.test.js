import test from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/state.js";
import { bindControls } from "../src/controls.js";
function fixture() {
  const state = createState(),
    handlers = {};
  const canvas = {
    addEventListener: (name, fn) => (handlers[name] = fn),
    getBoundingClientRect: () => ({ left: 10, width: 210 }),
    setPointerCapture: () => {},
  };
  bindControls(state, canvas, { addEventListener: () => {} });
  return { state, send: (name, e) => handlers[name](e) };
}
test("mouse maps scaled canvas coordinates and clamps to battlefield", () => {
  const { state: s, send } = fixture();
  send("pointermove", { pointerType: "mouse", clientX: 20 });
  assert.equal(s.gunX, 210);
  s.mode = "playing";
  send("pointermove", { pointerType: "mouse", clientX: 60 });
  assert.equal(s.gunX, 100);
  send("pointermove", { pointerType: "mouse", clientX: 500 });
  assert.equal(s.gunX, 375);
  send("pointermove", { pointerType: "mouse", clientX: -50 });
  assert.equal(s.gunX, 45);
});
for (const release of ["pointerup", "pointercancel", "lostpointercapture"])
  test(`touch drag is relative, ignores other fingers and stops on ${release}`, () => {
    const { state: s, send } = fixture();
    s.mode = "playing";
    const e = { pointerType: "touch", pointerId: 1, clientX: 100 };
    send("pointerdown", e);
    assert.equal(s.gunX, 210);
    send("pointermove", { ...e, pointerId: 2, clientX: 140 });
    assert.equal(s.gunX, 210);
    send("pointermove", { ...e, clientX: 140 });
    assert.equal(s.gunX, 290);
    send("pointermove", { ...e, clientX: 1000 });
    assert.equal(s.gunX, 375);
    send(release, e);
    send("pointermove", { ...e, clientX: 50 });
    assert.equal(s.gunX, 375);
    assert.equal(s.shots.length, 0);
  });
