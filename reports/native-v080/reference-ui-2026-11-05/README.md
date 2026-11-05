# Reference-style signal UI and frequency investigation — November 5, 2026

This continues the user's Entry/SL/TP screenshot request. It upgrades only the separate [`indicator_clear_levels.pine`](../../../pine/experiments/indicator_clear_levels.pine); both frozen v0.8.0 baseline files remain unchanged. The preceding clear-levels source and the new user reference are preserved in this folder.

## Implemented

- Bounded risk/reward boxes and BUY/SELL Entry, SL and TP1–TP3 captions stay beside the original signal bars. Ended plans freeze rather than stretching yesterday's box across the live chart.
- Up to three recent plans are retained, with explicit ended/invalidated state. A new candidate cannot replace an older plan's saved direction or prices.
- Optional label spacing uses connector lines to the **exact** price levels. Only display coordinates use the visible chart range; signal predicates do not. Manual axis scaling can still affect spacing; the fixed price card remains available.
- A smaller dark two-column status/price card shows the current decision, actual session, H1/M15 context, original signal time and planned prices. Indicator execution remains an estimate.
- Time-based object coordinates avoid the bar-index distance limit when scrolling old plans. At most three plans create 30 lines, 15 labels and six boxes; the existing history/context overlays remain separate and bounded.
- The reconstruction regression removes only presentation additions and recovers the frozen parent exactly. All alerts, audits, confirmation rules, prices and risk gates are preserved.

## Actual frequency finding

The genuine preserved London/H1 M5 Indicator export contains **69 plans on 18 dates**: B 41, F 11, C 7, E 5, D 3 and H 2. No A or G plan was selected in this combined-module capture. This is **not** a standalone A-module backtest, and the first plan timestamp does not authenticate the history's first calculation bar. See `current-frequency-evidence.json`.

Eight of those dates contain five selected plans, consistent with the configured five-plan session cap. The count alone does not prove which candidate was rejected by that cap. Earlier native candidate traces independently documented specific quota rejections; those historical findings remain in the Nov 5 continuation evidence.

The original A-only sample being sparse is consistent with A's required sweep → later displaced MSS/FVG → still-later retest sequence. B–H use their documented, explicit approximations; these names are not a certification of every discretionary ICT/SMC interpretation. Review of the current shared predicates did not establish a new trading-rule defect.

The isolated next comparison changes **only London → All major sessions**, keeping A–H, Close entry, H1, quality 75, cooldown five, quota five, holding time 15 and the common stop/RR/volatility checks. A wider admission period can still reach the same quota early; more plans are not guaranteed and do not prove better returns. `session-comparison-protocol.json` records the hypothesis and required actual runtime captures.

## Verified and pending

The initial reference UI revision (`be4d1785…76c2857`) has an exact 1,434-line native editor copy-back and compiler success at **12:56:36 PM Phnom Penh**, recorded in `native-compile-first.ax.txt`. Earlier `compile-attempt-1.*` captures did not expose the full compiler evidence and are retained as unsuccessful observations.

One subsequent display-only fix ensures a later setup's global status cannot relabel an ended plan as a new setup. Final source: **`dc3df594fca8d476d485a1991fa9f1eab4c07629d741520377b17e10dcc2e6b2`**. Its final native copy-back, visual review, foreground-axis check and save/reload verification are **PENDING**.

Chrome repeatedly changed focus to unrelated ChatGPT windows, and a returned TradingView screenshot diverged from the active AX window. UI actions were stopped when that divergence was detected. The smallest unblock is to leave TradingView foreground and idle for the remaining native checks. No final UI acceptance, new session-comparison result, Replay pass or profitability claim is made.

Final `npm run verify` passed **174 tests / 18 files**, TypeScript, generation consistency and all eleven independent Pine parses. `npm audit --omit=dev` reported **0 vulnerabilities**; `git diff --check` passed. Actual output is in `local-verification-final.txt` and `dependency-audit.json`. No source was promoted to a release, no saved baseline script was overwritten, and no trade, alert, Telegram message, deployment or account upgrade was performed.

References: [TradingView drawing coordinates](https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/), [visible chart times](https://www.tradingview.com/pine-script-docs/concepts/time/), [session/timezone behavior](https://www.tradingview.com/pine-script-docs/concepts/sessions/), and [confirmed bars and repainting limits](https://www.tradingview.com/pine-script-docs/concepts/repainting/).
