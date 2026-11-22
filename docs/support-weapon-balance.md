# Milestone 16A support weapon balance

The baseline is main at `848c1eb`. Both versions use the existing scripted aim policies at 60 simulation Hz, with precisely the same choices within each active/inert pair. In the inert control, opening the barricade still costs cannon shots and triggers support, but damage is zero. Time stops when combat ends. Populations are surviving troops in the battle, rounded to whole cats. Arrivals through ×99 provide a scale reference in blue reinforcements. Support damage counts red casualties, so the columns measure different contributions.

| Level and aim | Outcome, baseline → updated | Seconds | Blue left | Red left | Support damage | Unlock (s) | First damaging hit (s) | ×99 arrivals |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 Gates only | Win → win | 98.43 → 98.43 | 156,087 → 156,087 | 0 → 0 | 0 → 0 | — | — | 19,305 |
| 2 Purrapult first | Win → win | 91.70 → 83.30 | 159,192 → 120,240 | 0 → 0 | 50,860 → 64,178 | 12.07 | 15.42 → 13.17 | 19,305 |
| 2 Gates and Purrapult | Win → win | 100.05 → 93.70 | 170,362 → 175,369 | 0 → 0 | 44,660 → 59,821 | 29.98 | 33.35 → 31.10 | 24,057 |
| 2 Purrapult only | Loss → loss | 16.83 → 16.83 | 0 → 0 | 4,713 → 4,571 | 5,427 → 5,568 | 3.38 | 6.75 → 4.50 | 0 |
| 3 Gates only | Win → win | 111.95 → 111.95 | 120,949 → 120,949 | 0 → 0 | 0 → 0 | — | — | 20,196 |
| 3 Meowmen first | Win → win | 82.03 → 72.95 | 148,117 → 108,984 | 0 → 0 | 33,480 → 39,450 | 2.83 | 3.63 → 3.12 | 20,196 |
| 3 Gates and Meowmen | Win → win | 95.35 → 91.98 | 186,743 → 206,929 | 0 → 0 | 32,040 → 42,513 | 21.58 | 22.38 → 21.87 | 12,474 |
| 3 Meowmen only | Loss → loss | 16.83 → 16.83 | 0 → 0 | 6,430 → 3,850 | 6,120 → 8,700 | 2.83 | 3.63 → 3.12 | 0 |

| Matched aim policy | Inert win (s) | Baseline with damage vs inert | Updated with damage vs inert |
| --- | ---: | ---: | ---: |
| Level 2 Purrapult first | 118.60 | 22.7% faster | 29.8% faster |
| Level 2 Gates and Purrapult | 117.08 | 14.5% faster | 20.0% faster |
| Level 3 Meowmen first | 100.50 | 18.4% faster | 27.4% faster |
| Level 3 Gates and Meowmen | 107.08 | 11.0% faster | 14.1% faster |

Support-first gains exceed the initial 25% target by 2–5 points, while the mixed routes land near the target range. The two support-only losses and viable gates-only wins preserve the aiming trade-off. Level 3's fastest scripted route is 10.35 s ahead of Level 2's fastest route (9.67 s at baseline), and Level 3's gates-only route still takes 13.52 s longer. Mixed routes finish within two seconds of each other. At 30 and 120 direct simulation Hz the policies retain the same win/loss outcomes. Direct variable-step timings and populations vary with input quantization. The browser uses a fixed 60 Hz combat tick, and the render-rate regression verifies identical authoritative states and events at 30, 60 and 120 Hz with identical tick-level aim.

The Meowmen launch six arrows every 0.24 s with targets in range, up from every 0.80 s. Damage per arrow drops from 60 to 25, so a full 150-casualty volley contributes up to 625 casualties per second, up from 450. The first volley launches after 0.10 s. Each event feeds twelve staggered visual shafts and up to three resolved volleys can leave visible effects concurrently. Purrapult's opening delay drops from 2.40 s to 0.15 s. Its regular 2.40 s reload and 0.94 s flight are retained. The impact ceiling rises from 2,250 to 3,400 with a radius of 54 up from 37. Small formations are protected by the existing pocket cap, now `550 + 0.23 × red population`. The first resolved damaging impact has a wider visual shockwave.

Run `node scripts/simulate-support.js` to reproduce the strategy matrix. To run against the baseline, copy the script into the `scripts` directory of a worktree at `848c1eb`.
