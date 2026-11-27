# Milestone 24 — Ocean of Cats

## PR #38 review revision

Level 1 still opens with 34 blue and 78 red cats. The red mobilization begins at 30 seconds, ramps in and out over eight seconds, and ends at 77 seconds or when blue cuts the supply route. Its extra intake peaks at 720 cats per second. The first 360 red cats count normally for contact. Contributions beyond the first ranks diminish logarithmically before the existing frontage curve applies. When blue earns a decisive advantage, the red casualty cap rises so displaced reserves can collapse before the battle becomes a cleanup grind. Losses still come from the existing aggregate attack. Levels 2–4 retain their combat settings.

In dense corridor battles, interlaced detail ranks widen into the terrain-defined lane and overlap the first reserve ranks. Compression flows through staggered columns behind the live line in the direction of contact pressure. The displacement is at most 18 world units and is clipped at the battle line. Retreat shortens the reserve depth, while the moving line creates more space behind the advancing side. The renderer still uses the same bounded sprite and tile budgets. The narrower stone crossing constrains how broad the contact can get, and individual ranks become most readable again as the armies enter the yards.

The green relay now multiplies by five. Three shots give 300 cats at the right gate and 1,500 after the downstream crossing. The relay opens with the existing barricade, and the wave fans outward from the crossing over about a third of a second. Its cat tiles follow the moving cohort and merge into the receiver on the existing travel schedule.

| Balanced strategy | Outcome | Peak blue / red | Battle time |
| --- | --- | ---: | ---: |
| Previous PR, ×100 → ×3 | Victory | 68,281 / 3,495 | 89.55 s |
| Staggered intake, ×100 → ×3 | Victory | 49,941 / 22,032 | 77.97 s |
| Staggered intake, ×100 → ×5 | Victory | 75,407 / 21,389 | 75.78 s |
| Staggered intake, ×100 → ×10 | Victory | 134,575 / 20,945 | 73.83 s |
| Earlier intake, ×100 → ×5 | Victory | — / 28,592 | 97.30 s |
| Staggered intake with full reserve pressure, ×100 → ×5 | Defeat | — | 56.30 s |

Earlier intake pushed the line down to y=642 and held the first relay until 79.87 seconds. The selected setup reaches the relay at 57.47 seconds and puts 10,355 blue against 21,388 red at the same contact at 60.08 seconds. Doubling the relay from ×5 to ×10 added around 59,000 blue cats at peak with less than two seconds of extra time saved. Staying on ×25 after unlocking it can win in about 121 seconds. Camping on ×5 or rushing the right barricade still loses. The balanced strategy lost 9,468 blue and 37,912 red cats, compared with 15,394 blue and 12,963 red on the previous PR.

### Visual comparison

| Previous PR at 30,000 cats per side | Revision at the same population and contact line |
| --- | --- |
| ![Previous reserve layout](evidence/ocean-of-cats/review-baseline-30000.jpg) | ![Revised ranks and reserve layout](evidence/ocean-of-cats/review-selected-30000.jpg) |

| Contested approach, game time 61 s | Blue takes the upper yard, game time 74 s |
| --- | --- |
| ![Red holds the upper field as blue gathers below](evidence/ocean-of-cats/review-contested.jpg) | ![Red contracts as blue fills the ground it vacated](evidence/ocean-of-cats/review-breakthrough.jpg) |

The second pair comes from one uninterrupted Level 1 run with the HUD hidden. Red peaked at 22,299 cats in this recording. The line reversed near y=392 while blue reinforcements arrived and reached y=100 at victory. Red held the upper yard before the reversal. Blue passed through the crossing, spread onto the open approach and continued forward while the red footprint contracted toward the castle. Terrain and reinforcement gate labels remained visible.

### Review recordings

The level selector and one-finger cannon controls drive all five clips. Clips A–D are excerpts from E. Their timing is the original browser capture, which sometimes ran slower than game time on the shared host.

- [A — The enormous red army](https://raw.githubusercontent.com/Urqe/RagdollLabs-battlecats/aa3af00e4066e664c26362b3bd02b40c3d7ed002/A-red-army.mp4)
- [B — Two armies colliding](https://raw.githubusercontent.com/Urqe/RagdollLabs-battlecats/aa3af00e4066e664c26362b3bd02b40c3d7ed002/B-collision.mp4)
- [C — Reinforcement and territorial conquest](https://raw.githubusercontent.com/Urqe/RagdollLabs-battlecats/aa3af00e4066e664c26362b3bd02b40c3d7ed002/C-territorial-conquest.mp4)
- [D — Compound multiplication](https://raw.githubusercontent.com/Urqe/RagdollLabs-battlecats/aa3af00e4066e664c26362b3bd02b40c3d7ed002/D-compound-multiplication.mp4)
- [E — Complete Level 1 victory](https://raw.githubusercontent.com/Urqe/RagdollLabs-battlecats/aa3af00e4066e664c26362b3bd02b40c3d7ed002/E-complete-victory.webm)

### Review verification and performance

All 25 Node test files passed, including compound accounting and the Levels 2–4 support mechanics and connected campaign. The strategy report is identical at 30, 60 and 120 Hz. The recorded Level 1 run reached victory in 77.13 game seconds. [Raw strategy and performance reports](https://github.com/Urqe/RagdollLabs-battlecats/tree/0f24bc8762d3a9e1c6f24869f97380ac3dcbef4b/measurements)

The tests below compare the previous PR head `9c5a029` with the revision at the same static contact geometry and population, at 390 × 844 and DPR 2. Each cell shows canvas draw p50/p95 and frame interval p50/p95 in milliseconds. These are short Linux browser samples with shared-host contention. WebKit collected fewer usable frames, with none at the previous build's 30-cat checkpoint in this run. Slow frame intervals in both engines limit what these timings establish. Physical iPhone Safari performance remains unverified.

| Cats per side | Chromium previous | Chromium revision | WebKit previous | WebKit revision |
| ---: | ---: | ---: | ---: | ---: |
| 30 | 1/7.5 · 33.3/150 | 0.5/10.8 · 16.7/66.7 | — | 3/9 · 177/180 |
| 100 | 1/5 · 33.3/83.4 | 0.7/9.5 · 16.8/50 | 23/23 · 610/610 | 3/17 · 199/245 |
| 300 | 4.4/24.5 · 66.7/183.3 | 3.4/13.4 · 33.34/66.6 | 3/42 · 212/259 | 10/17 · 160/229 |
| 1000 | 1.1/10.9 · 33.4/83.4 | 2.9/14.1 · 16.7/66.7 | 32/32 · 1002/1002 | 2/10 · 176/200 |
| 3000 | 1.1/12.7 · 50/100 | 2/11.8 · 33.3/66.7 | 54/159 · 448/495 | 2/10 · 141/198 |
| 10000 | 2.7/46.5 · 83.3/116.7 | 2/11.2 · 33.3/66.7 | 12/44 · 205/229 | 16/48 · 195/267 |
| 30000 | 7.3/54.9 · 99.9/300 | 3.3/12.4 · 50.1/83.3 | 7/12 · 184/206 | 12/34 · 216/268 |
| 100000 | 1.9/11.8 · 83.3/133.3 | 1.8/4.2 · 16.7/66.57 | 3/14 · 232/288 | 9/45 · 184/228 |
| 300000 | 7.1/16 · 83.3/199.97 | 1.8/3.9 · 16.7/66.7 | 12/16 · 242/286 | 12/17 · 182/210 |

At 30,000 each, both builds submit 252 detailed cats and 1,348 reserve silhouettes per side. Approximate red/blue occupied area moves from 50,879/78,085 to 47,072/72,898 CSS px² at the static contact because the denser bands overlap. The change in coverage over time comes from the moving line and the reserve buildup in play. At 300,000 each the cap stays at 252 detailed cats and 1,560 reserve silhouettes per side. Chromium reported approximately 2.24/2.79 MB of JavaScript heap at the 30-cat checkpoint and 3.01/3.50 MB at 300,000 cats, previous/revision. WebKit supplied no heap measurement.

The relay and encirclement were also profiled at fixed-step gameplay checkpoints. Level 1 is matched by the first compound crossing, so the populations differ. Level 4 reaches the same state in both builds.

| Checkpoint | Chromium previous → revision | WebKit previous → revision |
| --- | --- | --- |
| Level 1 first compound wave | 5.3/11.4 · 49.9/83.4 → 6.7/44.1 · 66.7/100 | 4/8 · 52/94 → 3/28 · 54/93 |
| Level 4 encirclement | 4.8/11.1 · 33.4/66.8 → 2/13.9 · 33.4/66.7 | 6/37 · 73/166 → 2/7 · 52/78 |

At the first relay, red grows from 280 detailed sprites plus 264 reserve silhouettes to 286 plus 1,116. Blue has 329 detailed sprites and 84 reserve silhouettes at that revision checkpoint, including cohorts in transit. The later recording shows blue fill in as the chain arrives.

## Original Milestone 24 submission

The historical comparison below describes the first PR submission and its original ×3 relay.

### Baseline and rendering

The comparison starts at `05f50a2`, which includes the Milestone 23 renderer and the territorial crowd movement principle. Milestone 23 capped the corridor at 252 detailed slots and 720 reserve silhouettes per side. In the 30,000-versus-30,000 diagnostic, the red reserves covered a narrow block with a gap between it and the detailed ranks. Blue reached the width of the lower yard, but its rear formation ended partway through the yard. At 100,000 the fields hardly grew.

The selected renderer keeps one-to-one detail through 150 active cats in the main corridor and 112 per normal crossing. The same deterministic slots still handle footfall variation, casualty recoil, artillery gaps, arrow reactions, and arrival handoffs. Supporting cat ranks spread across the usable lane as the formation increases. Reserve ranks use the existing six-cat atlas, with ear and face detail painted into the cache. Stable center-out indices, alternating lateral stagger and staggered stride phases break up repetition. The cache builds once per renderer.

The rear footprint uses the live frontline, the legal rear edge, and a logarithmic share of the available depth. Reserve count increases smoothly after 3,000 cats, from the original 291 at 3,000 to 1,348 at 30,000. The blue receiver follows the occupied rear rows. An eased presentation population and the existing reserve extent interpolation spread that growth over several frames. A retreating side compresses its reserve reach by up to 17%, weighted by velocity and pressure advantage. As the line moves, its available depth changes with it.

The contact seam uses a deterministic wave up to 4.6 world units away from the authoritative line. It fades toward the corridor edges and combines with the existing exchanges and impact gap. Terrain width is sampled across the height of each reserve tile to keep the visible crowd within the sloping walls. Level 4 derives depth separately for each crossing and the rear encounter, using each branch’s center, frontage and legal rear depth. This lets the attacking flank and the Meowrtan wall compress the remaining red positions from opposite directions. Simulation casualties, pressure, supply and victory still belong to aggregate combat.

We considered increasing detailed slots alone and stretching the old reserve bands. A larger detailed grid increases per-frame work and makes the same cat pattern more visible. Stretching the old tile budget opens empty gaps in a larger yard. Growing reserve depth and the cached tile budget together gives 30,000 a substantially bigger footprint, and the curve saturates at 1,560 silhouettes per side. Crossing-specific caps are smaller. Very large forces keep their scale through approaching waves and motion once the yard fills.

### HUD-hidden scale check

These are fixed-population diagnostics at the same frontline and camera. The normal-control footage covers the actual changes in position and outcome.

| 300 per side | 3,000 per side | 30,000 per side |
| --- | --- | --- |
| ![300 cats per side](evidence/ocean-of-cats/selected-300.png) | ![3,000 cats per side](evidence/ocean-of-cats/selected-3000.png) | ![30,000 cats per side](evidence/ocean-of-cats/selected-30000.png) |

[Milestone 23 at the same 30,000-per-side setup](evidence/ocean-of-cats/baseline-30000.png)

## Playable compound gate

Level 1 uses the existing right barricade. Its 231 direct hits unlock the ×100 gate and the green downstream ×3 relay. The other two gates still give 15 and 75 cats per full volley. The right route gives 300 on the first crossing and 900 after a full three-cohort crossing of the relay. The relay is visible from the start and lights up with the route. The shared unlock keeps the choice on the existing three cannon paths and adds a second crossing without a new control. A coloured pulse and a widening column show the second multiplication.

A cannon volley keeps three projectile slots with one shared volley ID. Its first gate consumes each projectile and creates one aggregate cohort per slot. The cohort carries its origin, blue destination, marching progress, integer count and gate history. A forward sweep picks the closest physical eligible plane for the previous gate’s route. Overlaps at one plane choose one gate, and a recorded ID cannot apply a second time. Any receiving line that the cohort meets first takes precedence over a relay deeper on the route. That distinction matters when the enemy reaches the gates. A relay may open while a cohort is approaching. Marching cats have no combat losses until arrival.

Each multiplication checks the product for a positive safe integer. Arrival rejects an active total beyond the safe integer range. A ×99 → ×99 test verifies 29,403 cats across one full volley. Incoming squads only contribute to combat after arrival. Existing clocks pause and reset the travelled distance, and switching level clears both the cohort list and relay flashes. Levels 2–4 keep their own gates and support routes.

The relay paints a larger fan of detailed cats plus bounded cached groups. Old overlapping waves use the existing grouped drawing path. Stage magnification changes the visual release timing while the aggregate march continues at its usual speed.

## Balance comparison

The combat model and red intake stay at their Milestone 23 settings. A faster late red intake was also tried. Raising growth from 3.069 to 3.8 brought the red peak above 5,000 in policy C but caused policy D to lose before the final unlock. The selected change spends the more powerful reinforcement on the established right-route investment. Starter camping still loses in 53.13 s and a right barricade rush in 19.48 s. Early ×25 investment can still win without taking the relay.

| Balanced policy C | Complete volley | Gate unlock | First relay | Peak blue / red | Supply cutoff | Victory |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M23, ×100 direct | 300 | 56.87 s | — | 24,337 / 3,495 | 92.25 s | 93.60 s |
| Candidate ×100 → ×2 | 600 | 56.87 s | 63.35 s | 46,519 / 3,495 | 88.98 s | 90.87 s |
| Selected ×100 → ×3 | 900 | 56.87 s | 63.35 s | 68,281 / 3,495 | 87.40 s | 89.55 s |
| Stress candidate ×100 → ×8 | 2,400 | 56.87 s | 63.35 s | 164,668 / 3,495 | 84.27 s | 87.02 s |

The high candidate more than doubled peak population relative to the selected chain for about 2.5 seconds of battle duration. The ×3 relay leaves a visible contest before breakthrough and preserves the option to win through sustained ×25. The first relay can occur well after the barrier opens if the frontline intercepts the first marching cohorts.

## Portrait measurements

Matched headless Chromium 156 and WebKit 26 runs used a 390 × 844 viewport at device pixel ratio 2. Both sides started at the stated population and the same contact line. Occupied area estimates the union of atlas rectangles on an eight-world-unit grid and includes transparent margins. The files in the evidence archive also include width, depth, density and sprite submission counts separately for red and blue.

| Cats per side | Detailed / reserve per side, M23 → M24 | Red area, CSS px² | Blue area, CSS px² |
| ---: | ---: | ---: | ---: |
| 30 | 30 / 0 → 30 / 0 | 4,028 → 4,028 | 5,187 → 5,187 |
| 100 | 100 / 0 → 100 / 0 | 7,339 → 7,339 | 13,796 → 13,796 |
| 300 | 206 / 41 → 206 / 41 | 15,838 → 15,451 | 32,448 → 32,117 |
| 1,000 | 250 / 155 → 250 / 155 | 24,557 → 21,246 | 44,423 → 40,781 |
| 3,000 | 251 / 291 → 251 / 291 | 28,088 → 23,784 | 49,886 → 43,705 |
| 10,000 | 252 / 486 → 252 / 794 | 33,386 → 37,966 | 55,736 → 59,874 |
| 30,000 | 252 / 648 → 252 / 1,348 | 36,808 → 50,879 | 60,536 → 78,085 |
| 100,000 | 252 / 719 → 252 / 1,558 | 38,297 → 55,404 | 62,578 → 82,886 |
| 300,000 | 252 / 720 → 252 / 1,560 | 38,297 → 55,404 | 62,578 → 82,886 |

At 30,000, the red footprint grew from about 215 × 280 to 321 × 286 CSS pixels. The blue footprint grew from about 332 × 271 to 346 × 311. At medium counts the new reserves emphasize a tighter shoulder. At the 300,000 saturation point the visible area is stable.

Canvas submission p50/p95 and frame interval p50/p95 are in milliseconds. Each population sample below contains 18 measured animation callbacks.

| Cats per side | Chromium M23 | Chromium M24 | WebKit M23 | WebKit M24 |
| ---: | ---: | ---: | ---: | ---: |
| 30 | 0.6/7.3 · 16.7/33.3 | 0.7/2.7 · 16.7/16.8 | 2/6 · 61/79 | 1/5 · 42/71 |
| 100 | 0.8/3.4 · 16.7/33.3 | 0.7/3.4 · 16.7/16.8 | 1/6 · 78/95 | 1/6 · 62/73 |
| 300 | 1.4/3.5 · 16.7/33.3 | 1.1/3.1 · 16.7/16.7 | 3/7 · 100/144 | 2/8 · 72/81 |
| 1,000 | 1.1/3.5 · 16.7/16.7 | 1.5/6.3 · 16.7/33.4 | 3/9 · 99/142 | 2/7 · 74/89 |
| 3,000 | 1.3/1.8 · 16.7/16.7 | 2.8/4.2 · 16.7/16.8 | 5/11 · 104/155 | 3/35 · 82/91 |
| 10,000 | 1.2/1.5 · 16.7/16.7 | 1.2/1.7 · 16.7/16.7 | 4/12 · 95/137 | 3/7 · 89/100 |
| 30,000 | 1.2/1.8 · 16.7/16.7 | 1.5/2.2 · 16.6/16.8 | 3/7 · 81/107 | 4/7 · 60/92 |
| 100,000 | 1.3/2.4 · 16.7/16.8 | 1.7/4.4 · 16.7/33.3 | 2/39 · 80/101 | 4/13 · 60/114 |
| 300,000 | 2.1/4.5 · 16.7/16.7 | 1.7/2 · 16.7/16.7 | 2/6 · 80/91 | 3/7 · 49/70 |

| Actual replay checkpoint | Chromium M23 → M24 | WebKit M23 → M24 |
| --- | ---: | ---: |
| First large gate wave / first compound crossing | 4/11.1 · 50.1/83.4 → 3.8/10.5 · 33.3/66.7 | 5/27 · 269/333 → 6/19 · 82/179 |
| Level 4 encirclement | 4.1/14.3 · 66.7/216.6 → 2.1/7.1 · 16.7/66.7 | 26/53 · 298/368 → 12/36 · 265/313 |

The first compound checkpoint drew 459 blue and 280 red standalone figures plus 570 blue and 264 red silhouettes, including recruits in transit. The Level 4 checkpoint drew 304 blue and 145 red standalone figures plus 368 blue and 174 red silhouettes. Both scene samples use steady redraws of fixed-step replay checkpoints. Chromium’s approximate JavaScript heap reading was 2.1 → 2.2 MB at 30 cats per side and 3.2 → 2.8 MB at 300,000. WebKit omitted it, and neither engine’s sample measures retained Canvas or graphics allocation. Timing varied on the Linux host, particularly during the software WebKit runs. These results show the work stays bounded, with physical iPhone Safari frame delivery still to validate.

## Verification and evidence

Run `npm test` for compound ownership, overlap, unlock, reset, pause and determinism, and the existing support, route, and outcome tests. `node scripts/compare-ocean.js 30` takes a display rate of 30, 60, or 120 Hz. All three reports matched byte-for-byte. The full campaign regression suite covers the existing single-corridor support battles and connected Level 4 endgame.

Chromium and WebKit passed the smoke and archer fixtures. Chromium passed the full Level 1 playthrough with an in-flight 300-cat cohort and two recorded crossings. The uninterrupted touch recording also reached victory. The full WebKit playthrough suite was outside this check.

| Widest contested section | Blue advances up the lane |
| --- | --- |
| ![Red and blue meet on the lower approach](evidence/ocean-of-cats/gameplay-contested.png) | ![Blue extends into vacated territory](evidence/ocean-of-cats/gameplay-advance.png) |

These frames came from the normal game recording, with only the HUD masked for review. The gameplay archive contains 390 × 844 touch play from the normal level selector. Its clips cover opening growth, the relay, the red occupation, territorial advance, overlapping compound waves, an uninterrupted victory, and Levels 2–4. The large recordings and raw performance reports are kept outside Git in `SiegeDolls-M24-evidence.zip`. Clip D shows the line advancing from approximately y=487 to y=133. Clip E carries more than 10,000 cats across overlapping relay cohorts near its end. The 29,403-cat single volley was an arithmetic test.

```sh
npm ci
npm run dev
CHROMIUM_PATH=/usr/bin/chromium node scripts/profile-ocean.js chromium test-results/ocean
node scripts/profile-ocean.js webkit
node scripts/compare-ocean.js 60
node scripts/capture-arcade-combat.js test-results/ocean-gameplay a d f
```

Set `SIEGE_URL` to the HTTP server of the unchanged baseline worktree to reproduce the matched profiles. For actual relay and flank checkpoints, run `PROFILE_LEVELS=1,4 PROFILE_CHECKPOINTS=compound-wave,encirclement node scripts/profile-army-individuality.js chromium`. Use `large-wave,encirclement` on the baseline and substitute `webkit` for WebKit.
