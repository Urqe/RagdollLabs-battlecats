# Level 3 · The Meowmen

**Status** · Implemented. Hold the single crossing, push back to the red supply
entrance, and clear the remaining horde before it breaches the castle.

The ×20 gate starts open just right of center. The ×99 barricade is immediately
left of it, the ×999 barricade is on the right, and the Meowmen occupy a wooden
parapet on the far left. Their separate barricade takes 30 cannon hits, compared
with 72 for ×99 and 225 for ×999. The shots spent breaking wood could be
reinforcing the frontline instead.

## Volley support

The crew fires automatically after its barricade breaks. Six arrows fly from the
parapet toward a point in the occupied red formation. The existing simulation
resolves up to 360 casualties per hit, with a 0.28-second flight and 0.52-second
reload. If the formation leaves the aim point, the volley misses. Targets must
be within 460 vertical units, so the crew stops firing as the blue army pushes
the horde off the far end of the crossing.

The Meowmen deal up to 450 casualties per second while targets stay in range.
Level 2’s Purrapult delivers up to 2,250 casualties in a single splash with a
3.34-second cycle. On Level 3, a growing reinforcement stream gives early volleys
time to thin red ranks, then outpaces the crew on its own. Use ×99 to rebuild
between attempts on ×999. The same advancing-front and supply-cutoff rules
decide the battle.

## Deterministic balance checks

The policies in `tests/helpers/meowmen.js` use the regular cannon and observe
battle state. The table reports battle seconds to defeat or the start of the
victory march. The casualty column is the number directly attributed to arrows
at 60 Hz.

| Cannon policy | Outcome | 30 Hz | 60 Hz | 120 Hz | Archer casualties at 60 Hz |
| --- | --- | ---: | ---: | ---: | ---: |
| Stay on ×20 | Defeat | 50.9 | 51.0 | 51.0 | 0 |
| Gates only, alternating defense and barricade shots | Victory | 113.0 | 111.9 | 111.9 | 0 |
| Archers first, then push for ×99 | Victory | 86.1 | 82.0 | 82.0 | 33,480 |
| Both locked gates first, then archers | Victory | 113.0 | 112.2 | 112.1 | 19,080 |
| Reinforce with ×99, unlock archers, then alternate ×99 and ×999 | Victory | 96.1 | 95.3 | 95.3 | 32,040 |
| Rush the ×999 barricade | Defeat | 16.8 | 16.8 | 16.8 | 0 |
| Unlock archers and leave the cannon there | Defeat | 16.8 | 16.8 | 16.8 | 6,120 |
| Balanced schedule with arrow damage set to zero | Victory | 107.9 | 107.1 | 107.0 | 0 |

At six seconds the archer-first opening lets the horde reach y≈462, versus
y≈364 with the balanced opening. It still recovers when it follows up with
reinforcements, and leaving the cannon at the crew loses. Unlocking after a
short ×99 reserve saves nearly 12 seconds against the same cannon inputs with
zero arrow damage. At 60 Hz it holds the horde to y≈607 rather than y≈643
(the castle is at y=690). Waiting until ×999 is already supplying the front
leaves little time for the investment to pay off. The balanced win is close to
the 92-second artillery-assisted Level 2 benchmark.

Run `node --test tests/meowmen.test.js tests/archers.test.js` for the strategy
and volley checks, and `npm run test:browser -- meowmen.spec.js archers.spec.js`
for the portrait playthrough and volley visuals.

[Roadmap](../roadmap.md) · [Purrapult balance](../purrapult-balance.md)
