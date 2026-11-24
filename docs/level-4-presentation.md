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

## Battlefield presentation

Start `npm run dev` and choose **A Tale of Two Tails** from the normal
level selector. The connected battlefield and simulation use the same
entry, input, pause and result controls as the other levels.

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

The battlefield uses bounded presentation rows and effects. Render calls
sample the fixed-step state, including while effects and formations are
frozen on pause. The renderer does not adjust battle time, casualties,
reinforcements or routing.

## Comparative review

Level 1 builds a single large mass around its central seam. In Level 4,
two crowded seams animate simultaneously and the northern
staging field feeds their visual depth. The contact rhythm is shared
with Level 1, with a separate cadence for volleys against the shield wall.
The ×999 columns and west-to-east march provide more distinct movement
cues than the released Level 4. The west shield row anchors the left
contact as the right line moves into the staging field. The visible route
around the ridge explains the rear attack before the escape animation.

## Historical 19B preview recordings

At `af25959`, both levels were recorded in Chromium at 390 × 844. The Level 4 run
uses the opt-in preview with the selector, touch aim and cannon. The offensive reel
cuts between transfer arrival, the initial ×999 surge, and the later
right-side melee as the army closes in on command.

| Reel | What to watch |
| --- | --- |
| [A · Level 1 benchmark](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/a-level-1.webm) | Ordinary blue reinforcements, the crowded central seam, and airborne reactions |
| [B · Initial two-front combat](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/b-two-fronts.webm) | Two simultaneously active fronts leading into one castle apron |
| [C · Phalanx and withdrawal](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/c-phalanx.webm) | Marching formation, lock-in, blue withdrawal and sustained red shield impacts |
| [D · East offensive](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/d-offensive.webm) | Transfers joining the east reserve, dense ×999 waves, and the last main-army melee |
| [E · Final encirclement](https://github.com/Urqe/RagdollLabs-battlecats/raw/2fc808a4438c1e9f87694c4d3efa41205354add8/e-encirclement.webm) | A substantial flank around the north of the ridge, both west contact points, and the rout and flag |

From `af25959`, run `CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-connected-siege.js`
with the development server and FFmpeg available. Omit `CHROMIUM_PATH`
to use Playwright Chromium. The script preserves the full recording
locally and exports the five reels and phase metrics. The linked run won
at 110.4 s. Its touch aim follows the mixed strategy on a real clock,
so the capture's timings are evidence of the footage. The fixed-step
balance reference stays in the [19A architecture notes](level-architecture.md#matched-cannon-replays).

## Historical 19B viewport measurements

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


## Public Level 4 release

The release keeps the 19B combat layers and adds brief captions for
deployment, withdrawal, breakthrough and rear contact. Captions sit
above the battlefield and pause with combat. Both west multiplier
labels change to “→ EAST” when their routes change. The old preview
query and the obsolete Level 4 renderer are gone.

The five reels below come from one uninterrupted touch playthrough on
the normal public path at 390 × 844. The early reel starts while both
starter gates are feeding the lines. The double-upgrade reel shows
the west and east ×99 work followed by a cut to the late phalanx
investment. The offensive reel cuts from the ×999 unlock to the later
melee at command. The phalanx and encirclement reels run continuously.
The full video includes the result.

To reproduce with the local server running, use
`CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-connected-siege.js`.
Omit `CHROMIUM_PATH` to use Playwright Chromium. Set
`SIEGE_PROFILE_ONLY=1 SIEGE_BROWSER=webkit` to measure the same public
path in WebKit without video recording. The default policy plays a
seven-second adaptive rhythm. Real pointer input may land on a nearby
tick compared with the fixed-step strategy script.

The full run won at **113.7 simulation seconds**. The recording includes the menu and the outcome. [Uninterrupted public playthrough](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/level-4-full.webm) · [Level 1 benchmark](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/level-1-benchmark.webm)

| Reel | What to watch |
| --- | --- |
| [A · Early battle](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/a-early-battle.webm) | The two ×20 gates feed active fights before the stronger gates open |
| [B · Double-upgrade struggle](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/b-double-upgrade.webm) | Two ×99 investments and the switch between defenders and the expensive shield wall |
| [C · Deployment and transfer](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/c-phalanx.webm) | Shield lock, repeated impacts and the infantry moving through the apron |
| [D · Offensive breakthrough](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/d-offensive.webm) | Deep ×999 waves and actual main-army contact near command |
| [E · Encirclement and victory](https://github.com/Urqe/RagdollLabs-battlecats/raw/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/e-encirclement.webm) | The flanking column rounds the ridge, reaches the west rear, and clears the red resistance |

Level 1's benchmark packs the contact into one seam. Level 4 fills
two active seams and makes the east reserve grow visibly after
the transfer and ×999 arrivals. The heavier wall investment leaves
more time to see contact recoil and local reinforcements before the
formation locks. The later battle is readable through troop direction
and two visible west contact points.

### Public mobile-browser measurements

Both runs used the normal Level 4 selector at 390 × 844.
Chromium recorded the uninterrupted touch run. WebKit completed
the double-upgrade policy in 104.5 simulation seconds without
recording. Both ran on the shared emulation host alongside browser
checks. Frame intervals and Canvas JavaScript submission times
are in milliseconds. Maxima cover both runs.

| Phase | Chromium frame p50 / p95 | Chromium draw p50 / p95 | WebKit frame p50 / p95 | WebKit draw p50 / p95 | Represented soldiers max | Airborne max | Moving cohorts max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial melee | 16.7 / 50.1 | 1 / 8.3 | 23 / 63 | 1 / 3 | 1,089 | 16 | 15 |
| Phalanx deployment | 16.7 / 50.1 | 1.5 / 5.3 | 34 / 76 | 1 / 4 | 1,746 | 16 | 12 |
| Transfer | 16.7 / 33.4 | 1.1 / 5.1 | 30 / 66 | 1 / 2 | 2,122 | 16 | 19 |
| ×999 offensive | 16.7 / 33.3 | 1.2 / 5 | 25 / 64 | 1 / 3 | 2,868 | 16 | 15 |
| Encirclement | 33.3 / 83.3 | 1.4 / 15.9 | 25 / 67 | 1 / 2 | 3,291 | 16 | 16 |

The sampled peaks were 3,291 silhouettes, 16 active airborne cats and
19 moving cohorts. Reserve stamps draw up to six figures per Canvas
call. Host contention produced long frame intervals in both engines.
Physical iPhone performance remains unverified.
[Chromium public-path measurements](https://github.com/Urqe/RagdollLabs-battlecats/blob/5a2ca95cb3d7e1da3612729954f9723f7e3b5c37/chromium-recording.json) · [WebKit public-path measurements](https://github.com/Urqe/RagdollLabs-battlecats/blob/milestone-19c-recordings/webkit-public.json)

A separate unrecorded renderer probe sampled the same five phases at
390 × 844 after the browser suites ended. Canvas draw p50s were
1.0–1.2 ms in Chromium and 1 ms in WebKit. Frame p95s were
16.7–16.8 ms in Chromium and 17–23 ms in WebKit. WebKit's highest
frame p95 was during deployment. Draw p95s were at most 3.8 ms
and 3 ms respectively. The probe provides a lower-contention
comparison for the public-path measurements above.
[Isolated phase samples](https://github.com/Urqe/RagdollLabs-battlecats/blob/milestone-19c-recordings/isolated-renderer.json)

## Milestone 20 · Diagnosing the empty east front

In the public 19C baseline `f0bcd3c`, the adaptive-seven replay first
showed an empty east front at 27.933 s. The east had 2,152 blue, its
frontline was on the field at y=323.03, and supply was still admitting
120.01 red cats/s. At 60 simulation ticks/s that is about two red cats
per tick. East could deal up to 235 red losses/s, and the previous
casualty calculation could kill the entire arrival on the same tick.
The renderer therefore received zero living east reds. The
starter-only even-alternation replay first showed the same failure at
14.383 s at y=333.67 while receiving 80.71 red/s. It never unlocked ×999.
In adaptive-seven the east reinforcement rate eventually exceeded the
absolute loss ceiling as the battle clock advanced, allowing the horde
to accumulate again near the time the larger gate opened.

East casualties now also respect the live defender limit while supply
is open. In the matched replay, the minimum during pre-×999
reinforcement was 38.8 living east reds in adaptive-seven and 26.3
in even-alternation. The separate no-×999 victory run also kept living
defenders while the intake was positive. The regression exercises the real cannon replay, verifies
positive living red counts during supply, and checks actual soldier and
reserve draw coordinates at starter, ×99 and ×999 strengths. When
supply closes and the living count reaches zero the standing formation
clears. Airborne casualties can briefly finish their animations.

The shield wall and its opponents sample the same authoritative position
during the push. The deck and abutments frame the stationary formation
at y=308. Level 1 rank lag and pressure compression now carry through
to the deeper rows of the connected formations. Stable per-slot offsets
vary row edges and stagger movement. At the rear seam, formation depth
stops at its own side of contact. Part of the west horde's existing
draw budget faces the flanking army so both sides have visible contact
ranks, with no increase to the west horde's field or reserve caps. The wider, bounded flank column keeps
its files spread around the northern turn so the detachment is readable
as it approaches.

### Public gameplay and portrait performance

The five videos use the normal Level 4 selector and cannon input at
390 × 844. The final uninterrupted Chromium run won at 107.1 simulation
seconds. It includes the result screen and runs for 135 seconds
in the recording. The WebKit public run used the adaptive-seven
policy with recording disabled and won at 112.6 simulation seconds.
Both ran on a shared host with other browser work active.

| Phase | Chromium frame p50 / p95 (ms) | Chromium Canvas p50 / p95 (ms) | WebKit frame p50 / p95 (ms) | WebKit Canvas p50 / p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Both fronts engaged | 33.3 / 83.3 | 1.2 / 14.8 | 107 / 216 | 1 / 12 |
| Phalanx pushing | 33.4 / 100 | 1.8 / 28.4 | 106 / 165 | 1 / 10 |
| Shield wall secured | 16.8 / 83.3 | 1.2 / 8.8 | 96 / 147 | 1 / 6 |
| East breakthrough | 33.4 / 83.4 | 1.5 / 21.9 | 70 / 111 | 1 / 5 |
| Encirclement | 33.4 / 83.3 | 1.3 / 24 | 74 / 113 | 1 / 6 |

| Phase | Detailed soldiers | Reserve silhouettes | Airborne effects | Moving cohorts | Withdrawal cohorts | Flank cohorts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Both fronts engaged | 622 | 504 | 16 | 15 | 0 | 0 |
| Phalanx pushing | 623 | 1,329 | 16 | 15 | 0 | 0 |
| Shield wall secured | 444 | 1,718 | 16 | 16 | 10 | 0 |
| East breakthrough | 443 | 2,404 | 16 | 15 | 0 | 0 |
| Encirclement | 447 | 2,867 | 16 | 16 | 0 | 1 |

Counts are independent maxima from the two public runs. The flank
count includes the in-contact detachment. The WebKit public run
predates the final split of the west draw budget across its two
fronts. The isolated phase probe uses the final renderer in both
engines. These measurements are browser emulation on a Linux host.
Physical iPhone performance remains unverified.

To capture and profile the public route, run the development server,
then run `node scripts/capture-connected-siege.js`. Set
`SIEGE_CAPTURE_POLICY=double-upgrade` for the recorded tactic,
`SIEGE_BROWSER=webkit SIEGE_PROFILE_ONLY=1` for the unrecorded WebKit
profile, or `SIEGE_TOUCH=1` for Chromium touch input.

The unrecorded isolated probe used the final renderer at 390 × 844.
It prepared each adaptive-seven checkpoint on the fixed clock, warmed
up for 350 ms and sampled the next 1.55 s of live Canvas frames after
the other browser jobs ended.

| Phase | Chromium frame p50 / p95 (ms) | Chromium Canvas p50 / p95 (ms) | WebKit frame p50 / p95 (ms) | WebKit Canvas p50 / p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Both fronts engaged | 16.7 / 16.7 | 1.2 / 1.7 | 16 / 17 | 1 / 2 |
| Phalanx pushing | 16.7 / 16.7 | 1.2 / 1.5 | 16 / 17 | 1 / 2 |
| Shield wall secured | 16.7 / 16.7 | 1.2 / 1.6 | 16 / 17 | 1 / 1 |
| East breakthrough | 16.7 / 16.8 | 1.2 / 1.6 | 16 / 17 | 1 / 1 |
| Encirclement | 16.7 / 16.8 | 1.3 / 1.7 | 16 / 17 | 1 / 1 |

| Video | Gameplay |
| --- | --- |
| [A · East continuity](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/a-right-continuity.webm) | Living red contact through ×20 and ×99 |
| [B · Shield wall](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/b-phalanx-push.webm) | Release, march, deployment and push to the bridge |
| [C · Two-front combat](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/c-two-front-combat.webm) | Shield impacts and simultaneous east fighting |
| [D · Encirclement](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/d-encirclement.webm) | Departure, rear contact, advance and rout |
| [E · Full run](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/level-4-full.webm) | Uninterrupted victory with HUD and result |

[Chromium public metrics](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/chromium-public.json) ·
[WebKit public metrics](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/webkit-public.json) ·
[Isolated final renderer metrics](https://github.com/Urqe/RagdollLabs-battlecats/raw/bff7d97b106b7eebbbde3365835280be07709942/isolated-renderer.json)
