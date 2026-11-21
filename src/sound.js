const preference = "siegedolls.sound";
const MAX_VOICES = 8;
const VICTORY_VOICES = 3;

// Each note is [offset, start frequency, end frequency, length, volume, waveform].
const cues = {
  fire: { cooldown: 0.24, notes: [[0, 174, 67, 0.065, 0.16, "triangle"]] },
  gate20: { cooldown: 0.22, notes: [[0, 470, 710, 0.07, 0.075, "sine"]] },
  gate99: {
    cooldown: 0.24,
    notes: [
      [0, 303, 555, 0.13, 0.105, "triangle"],
      [0.05, 650, 840, 0.09, 0.06, "sine"],
    ],
  },
  gate999: {
    cooldown: 0.52,
    notes: [
      [0, 120, 218, 0.25, 0.15, "triangle"],
      [0.055, 290, 530, 0.19, 0.095, "triangle"],
      [0.13, 510, 918, 0.16, 0.06, "sine"],
    ],
  },
  wood: { cooldown: 0.23, notes: [[0, 249, 114, 0.055, 0.075, "triangle"]] },
  break: {
    cooldown: 0.35,
    notes: [
      [0, 230, 62, 0.18, 0.16, "triangle"],
      [0.038, 370, 149, 0.11, 0.1, "triangle"],
    ],
  },
  clash: { cooldown: 0.36, notes: [[0, 234, 128, 0.046, 0.06, "triangle"]] },
  reversal: {
    cooldown: 3.2,
    notes: [
      [0, 262, 330, 0.19, 0.12, "triangle"],
      [0.075, 393, 524, 0.24, 0.08, "sine"],
    ],
  },
  artilleryLaunch: {
    cooldown: 0.55,
    notes: [[0, 150, 360, 0.16, 0.13, "triangle"]],
  },
  artilleryImpact: {
    cooldown: 0.55,
    notes: [
      [0, 172, 62, 0.23, 0.17, "triangle"],
      [0.03, 245, 130, 0.13, 0.08, "sine"],
    ],
  },
  victory: {
    cooldown: 1.1,
    notes: [
      [0, 392, 392, 0.38, 0.11, "triangle"],
      [0.14, 523, 523, 0.4, 0.11, "triangle"],
      [0.28, 659, 659, 0.55, 0.1, "triangle"],
    ],
  },
};

export function createSound({
  makeContext = () =>
    new (globalThis.AudioContext ?? globalThis.webkitAudioContext)(),
  getStorage = () => globalThis.localStorage,
} = {}) {
  let enabled = false;
  try {
    enabled = getStorage()?.getItem(preference) === "on";
  } catch {
    // Private browsing can disable storage. The toggle still works in memory.
  }
  let context;
  let master;
  let voices = 0;
  const next = Object.create(null);

  // Invoke from a button's click handler so Safari can authorize playback.
  async function unlock() {
    if (!enabled) return false;
    try {
      if (!master || context.state === "closed") {
        const fresh = makeContext();
        const gain = fresh.createGain();
        gain.connect(fresh.destination);
        gain.gain.value = 0.3;
        context = fresh;
        master = gain;
        voices = 0;
        for (const name of Object.keys(next)) delete next[name];
      }
      if (context.state !== "running") await context.resume();
      return enabled && context.state === "running";
    } catch {
      // Another user gesture can retry an interrupted or denied context.
      return false;
    }
  }

  function setEnabled(value) {
    enabled = value;
    try {
      getStorage()?.setItem(preference, value ? "on" : "off");
    } catch {
      // Audio remains usable even if saving the preference fails.
    }
    if (master) master.gain.value = value ? 0.3 : 0;
    return value ? unlock() : Promise.resolve(false);
  }

  function play(name) {
    if (!enabled || context?.state !== "running") return false;
    const cue = cues[name];
    if (!cue?.notes) return false;
    const clock = context;
    const now = clock.currentTime;
    const voiceLimit =
      name === "victory" ? MAX_VOICES : MAX_VOICES - VICTORY_VOICES;
    if (now < (next[name] ?? 0) || voices + cue.notes.length > voiceLimit)
      return false;
    next[name] = now + cue.cooldown;
    for (const [offset, from, to, duration, volume, type] of cue.notes) {
      const oscillator = clock.createOscillator();
      const envelope = clock.createGain();
      const start = now + offset;
      const end = start + duration;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(to, end);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.014);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(envelope);
      envelope.connect(master);
      voices++;
      oscillator.onended = () => {
        if (clock === context) voices--;
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(end);
    }
    return true;
  }

  return {
    get enabled() {
      return enabled;
    },
    unlock,
    setEnabled,
    play,
  };
}
