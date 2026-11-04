# GreenShift demo script (3 presenters, about 14 minutes + questions)

**Screen:** Ashwin's Mac runs the website and the terminal for the whole talk. Sharvesh's Windows laptop is only used for the optional live RAPL measurement (part 4b).
**Rule for everyone:** say "placeholder job sizes" whenever you quote a percentage, and never quote the oracle number as a saving.

| # | Who | Time | Screen | Topic |
|---|---|---|---|---|
| 1 | Ashwin | 0:00-2:30 | Website: Summary | The problem statement and the answer in one screen |
| 2 | Vismay | 2:30-5:30 | Carbon data, Energy measurement | The data, and how energy is measured |
| 3 | Sharvesh | 5:30-8:30 | Scheduler, Plan tonight, terminal | How the scheduler decides, live |
| 4 | Sharvesh | 8:30-11:30 | Savings and delay, Paper replication | The results |
| 5 | Ashwin | 11:30-14:00 | Responsible AI | Limitations, what's pending, close |

---

## Before the talk (all three, 15 minutes before)

1. Mac: `cd GreenShift && source .venv/bin/activate && python scripts/run_all.py --skip-measure` (70 s; refreshes the stored forecast so the offline fallback is from today).
2. Mac: `cd frontend && npm run dev`, open `http://localhost:5173`, zoom the browser to 110%, close every other tab.
3. Open a second terminal tab in `GreenShift/` with the venv active, font size large.
4. Windows (only if doing 4b): charger in, Best performance mode, `.venv\Scripts\python scripts\check_machine.py` must report RAPL.
5. Rehearse once with Wi-Fi **off**: the Plan tonight page must show the amber "stored forecast" notice and still draw the plan.

---

## 1. Ashwin: the problem (2.5 min) · Summary page

- Read the brief in one line: *a data team wants to cut emissions from nightly Spark jobs without missing deadlines; measure energy, use grid carbon data to shift jobs, report savings and delay.*
- Key idea: shifting a job does not change its kWh, it changes the gCO₂ per kWh. GB grid carbon intensity swings a lot within a night, and NESO publishes a 48-hour forecast.
- Point at the stats strip: **about 5% CO₂ saved with the real forecast, median 2.5 h later, zero missed deadlines over 729 nights**, with placeholder job sizes.
- Point at "The brief, answered": each part of the brief and where it's answered. Mention the first-step callout honestly: the measurement campaign is the one item still pending.
- Hand over: "Vismay will show you the data and how we measure energy."

## 2. Vismay: data and measurement (3 min)

**Carbon data page**
- Two years, every half-hour, NESO API, CC BY 4.0, no key. Hover the heatmap: darker = dirtier; nights and summer middays are lighter.
- Typical day chart: night 116.7 vs day 133.4 gCO₂/kWh. Switch to "Weekday or weekend".
- Forecast error 9.7 g, **7.6% of the mean**, more than the 5% the paper assumed. That number comes back in the results.
- Cross-checked against NESO's own historic series: r = 0.993.
- Electricity Maps was substituted: its historical data now needs academic approval. The brief allows this with a reason, and there's a data card.

**Energy measurement page**
- Three signals: RAPL (measured, primary), battery (cross-check), utilisation model (estimate, labelled).
- Validation table: RAPL and the model agree within 5% on Windows.
- Protocol: idle bookends, warm-up, 5 randomised runs, 10% variation gate, gross and attributable energy.
- Be upfront about the sessions table: seven sessions, none passed the gate yet (heap limits, a reboot, the charger unplugging). They're kept, never pooled. That is the measurement method working as designed.
- Hand over: "Sharvesh built the scheduler; he'll show it deciding tonight's plan."

## 3. Sharvesh: the scheduler, live (3 min)

**Scheduler page** (30 s)
- 22:00 release, 07:00 hard deadline, 30-minute slots, at most k jobs at once.
- P4: largest job first into its cleanest window; before accepting, an earliest-deadline-first check proves all the other jobs still fit. Never worse than cron on the forecast.
- Two honesty rules: decisions see only the forecast; every gram is scored on the actual.
- Audit: 437,448 rows re-checked, 0 misses, 0 capacity violations. 49 tests pass on Windows and Mac.

**Plan tonight page** (1.5 min)
- "Live forecast" stamp: this is tonight's real NESO forecast.
- Walk the chart: grey = where cron runs each job, violet = where GreenShift puts it.
- Read one row of the decision log aloud, e.g. "daily_sales_report moved 5 h 30 min later: forecast 82 instead of 127".
- Click **Stored copy**: the "Matches Python" stamp shows that the browser runs the same scheduler as the Python code, slot for slot.
- Optional: toggle k = 2 to show parallel slots.

**Terminal** (1 min)
- `python scripts/run_scheduler.py --dry-run`: the same plan from the reference Python scheduler, saved to `results/plans/` for audit.
- **4b (optional, Windows laptop):** `python scripts/run_scheduler.py --now --job daily_sales_report` runs one real Spark job under the RAPL meter and prints the measured kWh and grams at the current forecast. Only do this if the 4th pre-talk check passed; if it fails, say "this needs RAPL, which is why it runs on the Windows machine" and move on.

## 4. Sharvesh: results (3 min) · Savings and delay page

- Stats strip: **5.09% [4.53-5.72] with the real forecast**; 7.68% is the perfect-forecast ceiling, not a claim. Median delay 2.5 h, zero misses.
- Scatter: up and to the left is better. Toggle k = 2: **9.87%**, because cron packs more work into the dirty first hours.
- Season bars: summer nights save most (8.4%), winter least (3.4%).
- Histogram: be honest. On 26.5% of nights the forecast plan came out worse than cron. The total is still clearly positive.
- **Paper replication page:** run the paper's way, ±2 h gives **4.45%, and its 95% interval contains the paper's 4.3%**. At ±8 h we find more (10.3% vs 7.4%), on a different year and grid mix. With the real forecast the saving is about a third lower: forecast quality matters.
- Hand over: "Ashwin will close with what these numbers do not show."

## 5. Ashwin: responsible AI and close (2.5 min) · Responsible AI page

- Average vs marginal carbon intensity: we use average, like the paper; real avoided emissions may differ.
- RAPL sees only the CPU package, so grams are low, but percentages are unaffected.
- Who pays for delay: the team reading the output. Hence the hard deadline and p95 delay reporting.
- Greenwashing guard: the headline is the real forecast scored on actuals, never the oracle.
- SCI: carbon intensity per batch falls from 115.6 to 109.7 gCO₂/kWh; E is pending measurement.
- What's left: one uninterrupted measurement session. Then `run_all.py` re-sizes the jobs and every page and table updates automatically.
- Close: "Shifting nightly jobs within their window cuts their emissions by about 5% on GB's grid, with zero missed deadlines, and we can show exactly why each job moved."

---

## Likely questions and who answers

| Question | Who | Answer |
|---|---|---|
| Why only 5%? | Sharvesh | GB nights are already the cleaner part of the day, so the window has little spread; Sukprasert et al. (EuroSys '24) find the same limit. Wider windows or more parallel slots save more (k=2: 9.9%) |
| Why is the oracle so much better? | Sharvesh | Forecast error. The real forecast captures 66% of the oracle saving; the paper's 5% noise model captures 88% |
| How do you know you're not cheating with future data? | Sharvesh | Policies only receive the forecast array; a test changes the actuals they must not see and checks the plans don't change. Scoring always uses actuals |
| Where are the grams? | Vismay | Pending the RAPL campaign; we refuse to estimate them. Percentages don't depend on energy when jobs are scaled equally |
| Why not Electricity Maps? | Vismay | Historical data needs academic approval now; NESO is the system operator, CC BY 4.0, 30-minute, and the brief allows substitution with a reason |
| Why does the website match Python? | Ashwin | It's a line-by-line port of P4; the page compares itself with the Python plan and shows "Matches Python" |
| Would this work on a cluster? | Vismay | Yes. YARN decides where, GreenShift decides when; on a cluster energy is attributed per executor CPU-second with the calibrated model |
| Is delaying jobs fair? | Ashwin | Every job keeps the 07:00 deadline, delay is reported per job, and any job can be marked non-movable |

## If something breaks

- No Wi-Fi: the site falls back to the stored forecast automatically and says so. In the terminal use `--dry-run --offline`.
- Site won't start: `cd frontend && npm install && npm run dev`. As a last resort, show `report/figures/*.png` and `report/results_tables.md`.
- The `--now` run fails on Windows: skip it; the measurement protocol is already on the Energy page.
