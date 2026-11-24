# Army scale and contact

## Previous renderer

The former blue curve drew roughly twice the square root of the number already in combat, with a cap of 340. It showed about 9 sprites for 20 cats and reached the cap at about 30,400 cats. The red curve added two saturating terms. It showed about 5 sprites for 20 cats, 273 for 2,000, 1,139 for 200,000, and at most 1,230. Red also put much of its visible population in the yard. Recomputing the number of columns from the current count or wrapping a marching row could reposition many cats at once.

The model gives one blue cat the frontline pressure of 25 standard red cats. At equal small counts, the two sides trade casualties but the simulation typically advances blue. This milestone preserves those rules. Matched cats can look evenly paired in the local exchange while their shared point of contact moves with the real frontline.

## Shared population model

The renderer uses the same curve for red and blue. Counts through 100 are literal for whole cats. A positive fractional remnant takes one slot. Above 100, a smooth blend of bounded exponential curves extends the visible force. Close ranks saturate first, then the reserve fills more ground and builds tighter distant ranks. The table is the uncropped budget at the same population for either faction. Very tight terrain can limit the presented footprint.

| Logical cats | Close ranks | Reserve | Total represented |
| ---: | ---: | ---: | ---: |
| 1 | 1 | 0 | 1 |
| 5 | 5 | 0 | 5 |
| 20 | 20 | 0 | 20 |
| 50 | 50 | 0 | 50 |
| 100 | 100 | 0 | 100 |
| 500 | 217 | 62 | 279 |
| 2,000 | 231 | 216 | 447 |
| 10,000 | 232 | 478 | 710 |
| 50,000 | 232 | 905 | 1,137 |
| 200,000 | 232 | 1,366 | 1,598 |
| 500,000 | 232 | 1,571 | 1,803 |

The close and reserve budgets are each monotonic. Across single-cat increments to 500,000, the combined budget grows by at most two representative cats per increment. The maximum is 232 close cats and 1,600 reserve cats per side. The reserves use one Canvas stamp for up to six low-detail cats at once. Every stamp has prepainted stride and tint variants, including partial groups.

## Contact, reinforcements, and casualties

- Rows widen from the center outward through stable slots. Light stride variation and local lunges animate the ranks without reassigning all slots after a casualty. A count-dependent contact response gives equal headcounts the same local attack and recoil amplitudes and lets the outnumbered side recoil farther. Momentum, position, and casualty events still come from the aggregate battle.
- Rear bands follow the frontline and get denser toward the far end. The red entry files spend up to 30 places from the existing reserve budget. The flow stops on cutoff and the last visible file fades into the remaining reserve. Battle strength and casualties determine how many slots remain occupied.
- Gate waves continue from the crossing and use actual march time. Only arrived blue strength fills the fighting ranks. Larger arrivals blend into the existing blue formation, and small formations show their current count immediately. A short display tail can preserve the last marching ranks of a resolved volley.
- The last red cats are individual figures. A small-army casualty can mark the loss of a whole visible slot even when a simulation tick recorded fractional losses. The Purrapult still launches at most 13 airborne cats on a successful hit. The local gap bends the same surviving slots while the new lower population determines formation density. A limited set of nearby reserve stamps can temporarily draw their members separately when a gap reaches them. A miss creates no casualty effect.
- Frontline sprites use their normal cached stride atlas. The terrain and reserve stamps are separate caches. Keeping silhouette painting apart from slot placement leaves room for a future themed formation with its own silhouette and spacing.

## Browser evidence

Captured at 390 × 844 with the HUD and banner hidden. A uses controlled start populations with the existing combat update. C holds population and frontline position fixed to isolate visual scale. B and D use the normal Level 2 battle and touch inputs.

| Clip | What to watch |
| --- | --- |
| [A · Small encounters](evidence/army-scale/a-small-encounters.mp4) | Five cats per side, then twenty per side. The first rank alternates lunges as both forces lose visible cats. |
| [B · Medium combat](evidence/army-scale/b-medium-combat.mp4) | ×99 cats cross and march before blue gains ranks at the front. |
| [C · Enormous army](evidence/army-scale/c-enormous-army.mp4) | A 2,000-red fixture cuts to 200,000 red cats. Both use the same frontage and opposing army. |
| [D · Purrapult recovery](evidence/army-scale/d-purrapult-recovery.mp4) | A real artillery hit opens the red formation. The wider reserve remains visible as survivors close the gap. |

Comparable stills at the same camera and frontline. [5 vs 5](evidence/army-scale/a-five-vs-five.png) · [20 vs 20](evidence/army-scale/a-twenty-vs-twenty.png) · [2,000 red](evidence/army-scale/c-red-002000.png) · [10,000 red](evidence/army-scale/c-red-010000.png) · [50,000 red](evidence/army-scale/c-red-050000.png) · [200,000 red](evidence/army-scale/c-red-200000.png) · [500,000 red](evidence/army-scale/c-red-500000.png)

Run `npm run dev` and then `node scripts/capture-army-scale.js`. The recorder requires Playwright Chromium and FFmpeg. It keeps the original video and event timings in the output directory. The recorded shot dealt 2,250 casualties, leaving about 9,032 red cats in the sampled frame. [Live capture timings](evidence/army-scale/timing.json)

## Validation and limits

Both deterministic simulation files match the committed results at 30, 60 and 120 Hz. Node tests cover literal and monotonic scaling, real frontline separation, the cutoff and final survivor, stencil draw budgets under large opposing armies, and artillery gap and count regressions. Existing Chromium and mobile-emulated WebKit playthroughs exercise normal play, progression and restarting.

Use `node scripts/profile-army-scale.js` with the dev server running to sample dense combat and a fixed 500,000-red versus 200,000-blue fixture at 2× device pixel ratio. The sample measures headless frame intervals and time to submit the battle and Canvas work. In one shared-runner sample with the browser suite running, median frame intervals were 33.4 ms in the live ×999 and artillery phase and 16.7 ms in the enormous fixture. Median update and draw-submission times were 2.3 and 1.5 ms respectively. Scheduling delays affected both runs. Frame rate, input latency and battery draw on a physical iPhone remain unmeasured.

Sprites represent rank occupancy once the armies exceed 100. Even near the horizon the renderer does not depict an exact location for each cat. Volley tails, dust and tumbling casualties are short-lived visual effects. The renderer has no independent soldier health or attack model.

## Milestone 10 · Army continuity

The Milestone 9 scale tests checked isolated populations. A subsequent playthrough exposed a drop that those tests did not exercise. The scale curve stayed monotonic, but the renderer treated a new budget as an immediate replacement for the previous one.

### Reproduced causes

- Blue growth used an exponential ease above 100 cats. The clamp admitted the full decrease as soon as the count fell below the visible value. The literal branch bypassed the ease. In the fixed-front fixture this made 50,000 → 10,000 remove 427 representatives in a single frame.
- Reserve rows calculated their column count from the current ground width. A column appearing or disappearing changed which ranks had enough occupied slots to draw. The entire reserve start and field spacing also used the current last occupied row. Stepping into a different band or row could move survivors even if their slot IDs were unchanged.
- The first positive victory progress hid the arrival tails and moved the drawn blue formation ahead of the simulation front. In the 60 Hz trace, the transition removed 144 blue representatives in Level 1 and about 180 in Level 2. Neither frame recorded a blue casualty. The fix keeps the frontline geometry and continues the existing waves on the victory clock through their fade. The largest opacity-weighted one-frame drop anywhere in the Level 1 and Level 2 winning traces fell from about 120 and 164 slots to about 27 in each. A separate sweep at a fixed 200,000 blue cats varied from 1,589 to 1,598 painted slots on the original renderer and stayed at 1,598 after the fix.

### Logical attrition audit

At 60 Hz, the winning Level 1 run peaked at about 177,484 blue cats. The largest loss was 144 in one tick and 8,412 across any one-second window. The winning Purrapult run peaked at about 164,487 blue cats. Its maxima were about 123 per tick and 7,233 per second. These are gross casualties, including frames with simultaneous arrivals. The starter-only Level 1 defeat peaked at 747 blue cats and lost at most about 11 in a tick or 310 in a second. The Purrapult produced real one-tick red losses as high as about 2,323 when artillery and contact resolved on the same step. These runs found no blue loss of tens of thousands in a frame or a second. The largest old blue cut in the winning runs instead coincided with the victory presentation. Both levels' deterministic outcome and milestone files still match at 30, 60 and 120 Hz.

The trace samples authoritative strength and frontline position every quarter second, alongside the number of painted representatives. A secondary measure weights each painted slot by opacity. This matters at the result screen, where a faint wave can stop drawing many sprite calls while contributing almost no visible coverage. [Before trace](evidence/army-continuity/before-trace.json) · [After trace](evidence/army-continuity/after-trace.json)

### Presentation model

- Living field and reserve budgets use arrived strength. Above the literal range, new field slots settle with a 0.22-second response and reserves with a 0.38-second response. The edge uses fractional alpha. Existing groups keep their slot identities, and marching gate waves remain separate until the simulation resolves arrival.
- Living occupancy falls to the actual budget immediately. A separate, bounded extent keeps the departed silhouettes in their old rows long enough to flatten and fade. They have no stride, lunge, contact response, or impact-gap displacement. The largest changes get a brief visible hold, more recoil and a faster envelope decay. Small groups keep literal living counts and show a few short falls on the front itself.
- Reserve columns are fixed to a band and change spacing with terrain. Changes in formation depth follow a continuous row reach. Frontline recoil responds to actual loss, then compression settles. Both teams use the same rules. Red entry continues to occupy part of the living reserve budget and ceases after cutoff.
- Artillery keeps its simulated target, cadence, damage, flying casualties, and local gap. The reserve taper shows permanent loss while the local opening closes independently. The end result stops drawing expired effects, and starting or switching levels clears the presentation state.

### Continuous mobile recordings

The battle clips are uncut at 390 × 844 with the HUD hidden, from first defense to result. Clip D uses a fixed simulation front and labeled, injected populations. Its steps are 200,000 → 150,000 → 100,000 → 50,000 → 10,000 → 1,000. At the 50,000 → 10,000 step the updated renderer kept all 1,137 silhouettes on the first frame at an opacity-weighted coverage of about 1,099. The living budget immediately fell to 710. The rest flattened and faded.

| Recording | Evidence |
| --- | --- |
| A · Level 1 win | [Complete win](evidence/army-continuity/a-level-1-victory.mp4) · [Victory transition before](evidence/army-continuity/before-victory.mp4) · [Victory transition after](evidence/army-continuity/after-victory.mp4) |
| B · Level 1 loss | [Starter-only defeat](evidence/army-continuity/b-level-1-defeat.mp4) |
| C · Level 2 win | [Complete artillery-assisted win](evidence/army-continuity/c-level-2-victory.mp4) |
| D · Controlled decline | [Before](evidence/army-continuity/before-population-decline.mp4) · [After](evidence/army-continuity/d-population-decline.mp4) |

Run `npm run dev` and `node scripts/capture-army-continuity.js` to reproduce the recordings. Run `node scripts/trace-army-continuity.js` for the 60 Hz data. Pass an output directory, a server URL, and a prefix such as `a-` to the capture script to run one scenario. Pass a baseline checkout directory to the trace script to compare builds. Concurrent headless recording slowed game time relative to wall time. The timing file records both. The overlays in D identify the imposed population steps. The live videos use the regular cannon inputs and outcomes. [Capture event timings](evidence/army-continuity/timing.json)

Representative deaths are a short-lived visual approximation. They illustrate the location and scale of losses, while exact combat remains aggregate. Packed ranks still compress through narrow ground. A near-empty defense can lose several literal cats on the same tick and should look like a collapse. During a shared Chromium run at 2× pixel density, median frame intervals were 33.4 ms with ×999 and artillery, 16.7 ms in the fixed 500,000-red and 200,000-blue fixture, and 33.3 ms during rapid depletion. Median update and draw submission took 3.5, 1.8 and 1.5 ms respectively. Reproduce these scenes with `node scripts/profile-army-scale.js`. Physical iPhone frame rate remains unmeasured. [Shared-runner timing](evidence/army-continuity/headless-shared-profile.json)

## Milestone 11 · Reinforcement movement and victory advance

### Reproduced behavior

In the 60 Hz Level 1 trace, the second ×20 volley reached the logical arrival plane at about 1.90 seconds. Its leading representative was near y=386 while new fixed field slots began in the fifth row behind the front, about 30 pixels farther back. The old tail kept its own approach-and-fade animation and new fixed slots appeared independently. At victory, the engine correctly stopped combat and froze the logical frontline at about y=66. The renderer used that frozen line for every blue formation frame, while the victory flag moved on a separate curve. That made a won battlefield look like a held line.

### Reinforcement movement

The moving wave slows through a receiving band derived from occupied field rows and nearby reserve depth. The band stays on the travelling side of the portal and changes position at a limited rate. The simulation still credits the exact squad at the same tick. After credit, newly available field and reserve slots can borrow a few of that wave's representative sprites. A nearby receiving slot draws one sprite travelling from the wave's continuing position into the rank. The regular traveller skips that member while the slot owns it. More distant reserve tiles and positions separated by gate scenery trade opacity with the traveller over the same interval. That preserves the silhouette budget without sending a cat through the scenery.

The handoff tracks at most 12 recently credited cohorts, with a ceiling of 24 representatives per cohort. Small blue arrivals also fill living slots progressively, while losses still reduce living occupancy immediately. Ordinary rear ranks follow the front with a limited delay, and their spacing responds to the existing pressure and casualty signals.

### Victory occupation

Authoritative victory stops contact reactions, freezes the real front, and cancels pending artillery through the existing engine. The presentation begins at that frozen line and moves the blue lead toward y=21, just inside the enemy entry. Field ranks and reserve bands follow with progressively greater delay. The flag appears during occupation. Existing marching sprites keep moving toward the force and fade in the last part of the celebration. Artillery gaps and grounded or airborne casualties can finish cosmetically. The result still appears after the existing 1.5-second victory interval.

### Portrait gameplay evidence

All clips use the normal game, a 390 × 844 viewport, and a hidden HUD. The large-wave clip is a continuous section from the ×99 unlock through the ×999 flood. The victory clips begin before elimination so the last resistance, the advance, and the result are visible together. The complete Level 2 capture recorded 24 resolved artillery impacts.

| Clip | Recording |
| --- | --- |
| A · Small ×20 handoff | [Previous build](evidence/army-movement/before-small.mp4) · [New handoff](evidence/army-movement/a-small-handoff.mp4) |
| B · Overlapping ×99 and ×999 | [Continuous large waves](evidence/army-movement/b-large-handoff.mp4) |
| C · Level 1 occupation | [Previous victory](evidence/army-movement/before-victory.mp4) · [New victory advance](evidence/army-movement/c-level-1-victory.mp4) |
| D · Level 2 occupation | [Artillery-assisted victory advance](evidence/army-movement/d-level-2-victory.mp4) |

Use `node scripts/capture-army-continuity.js test-results/army-movement http://127.0.0.1:4173 a- c-` with the dev server running to record both complete wins. The timing file marks the gates, first artillery impact, elimination, and result. [Capture timings](evidence/army-movement/timing.json)

The receiving band represents a group moving into another group. Each cat in a compressed reserve has a representative slot, and distant slots can blend their coverage with the incoming group. Dense overlaps can obscure an individual sprite on a portrait display. The recordings and browser checks use a mobile viewport in headless desktop browsers. Physical iPhone performance remains unmeasured.

## Milestone 12 · Formation dynamics and battlefield momentum

Milestone 11 followed the front with a single filtered support position. Position lag reached the rear, while most of the change in posture came from per-cat lunges, contact effects and casualty recoil. Milestone 12 replaces the support position with three filtered depth anchors. The live contact rank stays with the authoritative line. Field rows and reserve bands interpolate the same anchors, with a maximum 18 world-pixel displacement. The three filters use base response times of 75, 110 and 150 ms. Relative formation depth sets those times between 68% and 100% of their base values.

The presentation samples the observed line at 30 Hz and interpolates the last two samples for drawing. The front's velocity supplies signed drive. Nearby balanced combat and recent arrival credits raise the blue packing target. Retreat and recent blue clash losses increase compression, and sustained advance opens the spacing. Packing relaxes on a 410 ms response. The nominal field row pitch is 8.9 world pixels. At maximum packing the blue pitch contracts by 2.15 pixels before casualty recoil and terrain constraints. Red packing is subdued. Logical counts, casualty retirement, slot identities, artillery gaps and reserve tile budgets still use their existing paths.

A 1.46-second local opening bends both teams in the current direction of momentum. Its smooth envelope closes before the center moves to a new section. The influence falls away within 42 world pixels of the center and within six field rows. The yielding side can move up to 15 pixels before the field constraints, while the advancing side can move up to seven. Grounded draw centers stay on their side of the authoritative line during combat, including artillery-shifted survivors and arriving waves. Contact sprites can visually touch, and dense ranks still overlap in narrow terrain.

Holding reduces stride amplitude and shortens the existing lunges. As the line advances, the lead moves first and the spacing opens behind it. As it retreats, lead recoil and tighter ranks spread toward the supporting bands. Loose marches and victory retain their own gait. Victory immediately suppresses the local openings and combat lunges. The remaining spacing and anchor displacement ease away during the first 0.58 seconds of the existing occupation, while the original victory advance controls the surge. The receiving band follows the same rear geometry, with Milestone 11's ownership and interpolation rules.

The motion update uses three fixed-size arrays and a few scalar filters. Drawing evaluates the depth anchor and lane geometry once per occupied row. The local offset is limited to the first six rows, and distant reserves still use cached tiles. The frame-rate check compares the new motion field at common sample times for the same observed battle. Existing aggregate outputs keep their per-rate baselines, and intermediate live frames can vary with when the game produces an arrival or clash.

### Formation dynamics evidence

Record the normal, HUD-hidden victories and the labeled rendering fixture with `node scripts/capture-army-continuity.js test-results/formation-dynamics http://127.0.0.1:4173 a- c- e-`. The fixture drives a known hold, arrival, retreat, regroup and counterattack sequence against both builds. It isolates draw behavior with prescribed line motion and troop counts. The normal videos use the game's regular touch controls and winning strategies.

| Scene | Milestone 11 | Milestone 12 |
| --- | --- | --- |
| Level 1 · Reinforcements, reversals and victory | [Reinforcements](evidence/army-movement/b-large-handoff.mp4) · [Occupation](evidence/army-movement/c-level-1-victory.mp4) | [Complete HUD-hidden battle](evidence/formation-dynamics/level-1-victory.mp4) |
| Level 2 · Artillery, final-gate reinforcements and victory | [Occupation](evidence/army-movement/d-level-2-victory.mp4) | [Complete HUD-hidden battle](evidence/formation-dynamics/level-2-victory.mp4) |
| Rendering fixture · Hold, receive, recoil, regroup and push | [Same scripted motion on main](evidence/formation-dynamics/m11-formation-fixture.mp4) | [Formation dynamics](evidence/formation-dynamics/m12-formation-fixture.mp4) |

The gameplay videos are continuous at 390 × 844. Capture wall time and simulation time are recorded separately because the shared runner can slow the game's presentation. [Capture timings](evidence/formation-dynamics/timing.json)

Profile headless Chromium at 390 × 844 and device scale factor 2 with `node scripts/profile-army-scale.js`. The dense Level 2 case begins with the final gate active, waves present and a recent artillery impact. The fixed enormous army and step-down population cases isolate reserve batching and casualty retirement. Physical iPhone performance remains unmeasured.

The dense comparison began at 48,954 red and 18,307 blue. Milestones 11 and 12 both measured 16.7 ms median and 16.8 ms p95 frame intervals. Median update and draw submission rose from 1.9 to 2.9 ms in that scene. Milestone 12 measured 1.9 ms in the enormous fixture and 1.5 ms during rapid decline. [Before and after timings](evidence/formation-dynamics/headless-profile.json)

## Milestone 13 local encounters and occupation

A timed melee clash can authorize one bounded representative exchange per
side when its accumulated loss reaches a whole casualty. The lane selects
from five front-rank columns deterministically, with narrower selection in
literal armies. An exchange lasts 0.46 s. The losing rank recoils up to
14 logical units and the winner steps up to 8 before the opening closes.
A larger casualty batch can contribute one falling representative after
the lunge, using the existing bounded fall list. Literal formations still
show integer depletion directly. A lunge by itself is a harmless exchange.

Opposing ranks share a locally shifted contact seam with clearance between
them. Existing compression and depth lag follow the recorded frontline.
Artillery gaps can add nearby blue motion while that line is advancing.
Local motion and recoil never write to the frontline or counts. The
authoritative line can retreat during a local blue victory.

At victory, the renderer switches from engaged poses to a faster run cycle,
clears local combat presentation, and drops active red and contact visuals.
The charge begins at the recorded front and leads with a high initial speed.
Supporting ranks begin later and travel less. Red's entrance, surviving blue
counts and the recorded final frontline do not move in the simulation
during the 1.5 s celebration. Already launched blue ranks still follow the
existing visual handoff as the result appears.

[Portrait evidence and capture notes](playtest-log.md#milestone-13-validation)

## Milestone 21 · Rank and cohort continuity

The field is allocated center-out across forward shoulders before building
depth. Both renderers clamp their occupied frontage at the terrain edge.
Nearby casualties propagate a short forward pull through supporting
ranks. Reinforcement handoffs follow the occupied rear shoulder and
ease into open slots. [Formation rules and portrait evidence](living-armies.md#21b--living-formations)
