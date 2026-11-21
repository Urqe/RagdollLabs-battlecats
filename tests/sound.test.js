import test from "node:test";
import assert from "node:assert/strict";
import { createSound } from "../src/sound.js";

const noop = () => {};
function audioContext() {
  const parameter = {
    setValueAtTime: noop,
    exponentialRampToValueAtTime: noop,
  };
  const oscillators = [];
  return {
    state: "suspended",
    currentTime: 0,
    oscillators,
    createGain: () => ({
      gain: { ...parameter },
      connect: noop,
      disconnect: noop,
    }),
    createOscillator() {
      const voice = {
        frequency: parameter,
        connect: noop,
        disconnect: noop,
        start: noop,
        stop: noop,
      };
      oscillators.push(voice);
      return voice;
    },
    async resume() {
      this.state = "running";
    },
  };
}

test("sound defaults to muted and stored consent still waits for a gesture", async () => {
  const on = audioContext();
  const store = new Map();
  let contexts = 0;
  const options = {
    getStorage: () => ({
      getItem: (key) => store.get(key),
      setItem: (key, value) => store.set(key, value),
    }),
    makeContext: () => {
      contexts++;
      return on;
    },
  };
  const sound = createSound(options);
  assert.equal(sound.enabled, false);
  assert.equal(await sound.unlock(), false);
  assert.equal(sound.play("fire"), false);
  assert.equal(contexts, 0);
  assert.equal(await sound.setEnabled(true), true);
  assert.equal(sound.play("fire"), true);
  await sound.setEnabled(false);
  assert.equal(sound.play("victory"), false);

  await sound.setEnabled(true);
  const nextPage = createSound(options);
  assert.equal(nextPage.enabled, true);
  assert.equal(nextPage.play("fire"), false);
  assert.equal(contexts, 1);
  assert.equal(await nextPage.unlock(), true);
});

test("permission and storage failures are harmless and another gesture can retry", async () => {
  const context = audioContext();
  let blocked = true;
  context.resume = async () => {
    if (blocked) throw new Error("gesture required");
    context.state = "running";
  };
  const sound = createSound({
    makeContext: () => context,
    getStorage: () => {
      throw new Error("private browsing");
    },
  });
  assert.equal(await sound.setEnabled(true), false);
  assert.equal(sound.play("fire"), false);
  assert.equal(context.oscillators.length, 0);
  blocked = false;
  assert.equal(await sound.unlock(), true);
  assert.equal(sound.play("fire"), true);
});

test("combat repeats are throttled, and a ×999 chord uses a bounded voice budget", async () => {
  const context = audioContext();
  const sound = createSound({
    makeContext: () => context,
    getStorage: () => null,
  });
  await sound.setEnabled(true);
  assert.equal(sound.play("clash"), true);
  context.currentTime = 0.1;
  assert.equal(sound.play("clash"), false);
  assert.equal(sound.play("gate999"), true);
  assert.equal(sound.play("gate999"), false);
  assert.equal(context.oscillators.length, 4);
  context.currentTime = 0.37;
  assert.equal(sound.play("clash"), true);
  assert.equal(sound.play("gate99"), false);
  for (const voice of context.oscillators) voice.onended();
  context.currentTime = 1;
  assert.equal(sound.play("gate20"), true);
});
