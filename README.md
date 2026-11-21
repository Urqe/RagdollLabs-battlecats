# SiegeDolls 🐱⚔️

**Level 1: The Last Stand** — a small, ad-free, one-finger cat siege game, playable in a mobile browser.

**Play on GitHub Pages:** https://urqe.github.io/RagdollLabs-battlecats/

## How to play

- **Finger:** Slide across the game to move the cannon sideways. Tapping does not fire or teleport it.
- **Mouse:** Move the pointer over the battlefield to aim.
- **Keyboard:** Arrow keys or A/D.
- Your cannon fires **automatically**.

## Three-stage siege

1. **Middle ×20:** Available at the start. Reinforcements help hold back the enormous, slow red horde. A small detachment works on the ×99 barricade.
2. **Left ×99:** Once unlocked, **move the cannon into this lane**. Larger reinforcements stabilize the battle and chip away at the ×999 barricade. Staying on ×20 will *not* unlock the third gate.
3. **Right ×999:** Once unlocked, **move the cannon into this lane**. Firing through it starts the decisive counterattack. Keep firing until the red army has been pushed entirely off the screen.

The enemy army moves more slowly than blue cats but begins with overwhelming numbers. Gates only unlock through the previous active gate; opening a gate is not enough — use it. There is **no kill-count or countdown victory**. If the red front breaches the castle, you lose; if every red enemy is removed and the line is pushed back, you win.

## Technology

A self-contained HTML5 Canvas and vanilla JavaScript prototype with no build dependencies or backend. The camera perspective is simulated in 2D; logical army strength is separate from the hundreds of displayed cats to keep rendering responsive on phones.

## Scope

One playable level and a quick start/restart menu. Next: mobile playtesting, better combat feedback, true 3D/isometric rendering only if required, and level balancing before adding a second level.
