# Level 4 connected siege presentation

## Level 1 benchmark and the gap in the released Level 4

| Mechanism | Level 1 | Released Level 4 |
| --- | --- | --- |
| Scale | One population curve allocates literal small armies, up to 232 detailed slots, and up to 1,600 reserve silhouettes. Six-cat atlas stamps fill the rear cheaply. | Each lane's contact formation stops at 76 representatives. The detached northern horde adds silhouettes but conveys little about the depth of either fighting formation. |
| Contact | Staggered front ranks use pressure, encounter lunges, local exchanges and recoil. A moving seam and compressed rear rows communicate the direction of combat. | Small stride offsets and infrequent clash feedback leave most ranks looking static. |
| Reinforcement | Gate-specific waves approach a receiving band and hand off to owning slots. Larger multipliers affect both the moving column and the army depth. | Marches follow independent screen-space lanes. The wall traps west infantry in presentation and there is no rear maneuver. |
| Impact and victory | A bounded airborne pool distinguishes returning soldiers from defeated ones. Ground flashes and advancing ranks explain local exchanges and occupation. | The released renderer uses a small casualty pool per lane and an east victory sequence. It has no view of shield impact, withdrawal or rear-attack events. |
| Draw cost | Cached ground, a four-pose soldier atlas and stamped reserves keep dense Canvas composition practical. | Cached ground and the shared cat atlas are already available. Raising the detailed figure limit alone would miss the reserve depth and combat motion. |

The connected renderer will reuse the population curve, stable slots, atlas,
reserve stamps, encounter cadence, airborne recovery and flag timing.
Its formations will follow the 19A fronts and route cohorts. Two contact
areas and the rear attack will get separate effect pools so shield surges
leave room for ordinary melee feedback.

## Fixture and presentation

Start `npm run dev`, open `/?fixture=connected-siege`, then choose
**A Tale of Two Tails**. Level 4 without the query parameter uses the released
renderer and simulation. Levels 1–3 still use their existing presentation.

- The cached terrain joins one northern staging field to two approaches and
  one castle apron. A central ridge separates the approaches while leaving
  the north field and the southern junction open. The gate overlay preserves
  all six target footprints.
- Both teams use Level 1's population curve, center-out field slots and
  six-cat reserve stamps. Each contact formation draws up to 144 detailed
  cats and 588 reserve silhouettes in overlapping rows. The staging field
  borrows some of each lane's reserve slots while red entry is active.
- Staggered Level 1 encounter offsets act on the first three ranks.
  Population advantage changes spacing and recoil. The left, right and
  rear encounters each have an eight-cat airborne pool. Ordinary contact
  and shield impacts can displace a living representative temporarily.
  Separate casualty batches retire defeated cats. A bounded flash locates
  the exchange and the blue receiving band lights as a cohort joins.
- The Meowrtans march behind the active west frontline, spread into a
  two-rank formation and lock the front row's overlapping shields. The
  locked shields and the red front interpolate into the fixed bridge hold
  over 0.62 s, following the authoritative takeover. Shield impacts drive recoil and spear thrusts drive forward travel. A surge
  can launch multiple red cats while ordinary melee continues on the east.
- Withdrawals, rally turns and cannon squads sample the simulation's
  current route leg. The existing reserve sprite atlas draws compact
  columns, with more and wider files for ×999. West infantry gathers
  into the withdrawal column, and the files tighten as they join the east
  reserve. The right approach bends around the ridge as the receiving
  band advances.
- Following the main breakthrough, the actual flanking cohort crosses
  to the north of the ridge before turning toward the red rear. The west
  reds compress between the flank and the phalanx. Rear combat has its
  own pulses and the retreat animation uses the routed survivor count.
  The salute and flag raise start from the existing victory clock.

The fixture uses bounded presentation rows and effects. Render calls
sample the fixed-step state, including while effects and formations are
frozen on pause. The renderer does not adjust battle time, casualties,
reinforcements or routing.

## Comparative review

Level 1 builds a single large mass around its central seam. In the
fixture, two crowded seams animate simultaneously and the northern
staging field feeds their visual depth. The contact rhythm is shared
with Level 1, with a separate cadence for volleys against the shield wall.
The ×999 columns and west-to-east march provide more distinct movement
cues than the released Level 4. The west shield row anchors the left
contact as the right line moves into the staging field. The visible route
around the ridge explains the rear attack before the escape animation.

## Portrait gameplay recordings

Both levels were recorded in Chromium at 390 × 844. The Level 4 run
uses the actual selector, touch aim and cannon. The offensive reel
cuts between transfer arrival, the initial ×999 surge, and the later
right-side melee as the army closes in on command.

| Reel | What to watch |
| --- | --- |
| [A · Level 1 benchmark](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/a-level-1.webm) | Ordinary blue reinforcements, the crowded central seam, and airborne reactions |
| [B · Initial two-front combat](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/b-two-fronts.webm) | Two simultaneously active fronts leading into one castle apron |
| [C · Phalanx and withdrawal](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/c-phalanx.webm) | Marching formation, lock-in, blue withdrawal and sustained red shield impacts |
| [D · East offensive](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/d-offensive.webm) | Transfers joining the east reserve, dense ×999 waves, and the last main-army melee |
| [E · Final encirclement](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/e-encirclement.webm) | A substantial flank around the north of the ridge, both west contact points, and the rout and flag |

Run `CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-connected-siege.js`
with the development server and FFmpeg available. Omit `CHROMIUM_PATH`
to use Playwright Chromium. The script preserves the full recording
locally and exports the five reels and phase metrics. The linked run won
at 110.4 s. Its touch aim follows the mixed strategy on a real clock,
so the capture's timings are evidence of the footage. The fixed-step
balance reference stays in the [19A architecture notes](level-architecture.md#matched-cannon-replays).

## Mobile viewport measurements

The isolated profiles sampled actual `requestAnimationFrame` intervals
and whole-Canvas JavaScript draw time without video recording. The
mixed aim policy advanced to 8, 36, 51 and 102 simulation seconds before
sampling the four states for 3–4.5 seconds each. Values are milliseconds.
WebKit's JavaScript timing is rounded to the browser's millisecond resolution.

| Phase | Chromium frame p50 / p95 | Chromium draw p50 / p95 | WebKit frame p50 / p95 | WebKit draw p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| Initial combat | 16.7 / 16.8 | 1.2 / 1.8 | 16 / 17 | 1 / 1 |
| Shield wall | 16.7 / 16.7 | 1.0 / 1.5 | 16 / 17 | 1 / 1 |
| ×999 surge | 16.7 / 16.7 | 1.0 / 1.3 | 16 / 17 | 1 / 1 |
| Encirclement | 16.7 / 16.8 | 1.3 / 1.8 | 16 / 17 | 1 / 1 |

| Phase | Detailed soldiers max | Reserve stamps max | Represented silhouettes max | Active airborne max | Moving cohorts max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial combat | 614 | 89 | 1,117 | 16 | 12 |
| Shield wall | 422 | 357 | 2,130 | 16 | 25 |
| ×999 surge | 302 | 376 | 2,561 | 16 | 15 |
| Encirclement | 447 | 472 | 3,282 | 16 | 16 |

Counts take the larger observation across the isolated profiles and the
recorded run. A stamp draws up to six silhouettes in one Canvas call.
Recording alongside Playwright produced frame p95s of 33.4–66.7 ms on the
shared host, while the isolated profiles stayed at 16.7–17 ms. The
profiles measure this environment's rendering and scheduling. Physical
iPhone testing, gameplay balance and public cutover remain for 19C.
[Recording measurements](https://github.com/Urqe/RagdollLabs-battlecats/blob/2fc808a4438c1e9f87694c4d3efa41205354add8/metrics.json) · [Isolated profiles](https://github.com/Urqe/RagdollLabs-battlecats/blob/2fc808a4438c1e9f87694c4d3efa41205354add8/profile.json)
