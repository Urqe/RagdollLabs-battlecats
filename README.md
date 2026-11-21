# SiegeDolls 🐱⚔️

**Level 1: The Last Stand** — a small, ad-free, one-finger cat siege game, playable in a mobile browser.

**Play:** https://urqe.github.io/RagdollLabs-battlecats/

## Controls

- **Finger:** Slide across the battlefield to move the cannon sideways. No tap-to-fire.
- **Mouse:** Move horizontally over the battlefield.
- **Keyboard:** Arrow keys or A/D.
- The cannon automatically shoots **three tiny cats per volley**.

## Level 1

The enemy horde is slower than your blue cats, but initially has an overwhelming numerical advantage. You must choose when to reinforce the front line and when to unlock the stronger multipliers:

1. **Middle ×20:** Open from the start. Every incoming cat through the gate becomes 20. Three shots become a marching squad of **60 blue cats**. This can delay the invasion, but cannot sustainably defeat it.
2. **Left ×99 barricade:** Aim your cannon directly at the wood barrier instead of producing reinforcements. Each hit damages it, and a progress indicator shows your work. Once broken, fire through the ×99 gate for a larger army.
3. **Right ×999 barricade:** Takes more hits to break. Again you must personally aim at the wood, temporarily sacrificing reinforcements. Once open, send three cats through the gate to produce a **2,997-cat** counterattack per volley.

Cats do not instantly teleport to the front. Each gate creates a visible **marching formation** that moves toward the enemy; their army count is delivered when the formation reaches combat. Large squads render representative soldiers with their total still accounted for in the battle simulation.

**Victory:** After firing through ×999, eliminate the red army and push the frontline beyond the top of the screen. **Defeat:** Allow the red horde to reach the castle. There is no arbitrary countdown.

## Technology

One HTML file with HTML5 Canvas and vanilla JavaScript. No dependencies, backend, assets, accounts, or tracking. 2D perspective effects and formation aggregation support mobile browsers.

## Next

Playtest the timing and risk/reward of barricade clearing, animation smoothness, and the satisfaction of visible reinforcements. Keep the core one-finger controls.
