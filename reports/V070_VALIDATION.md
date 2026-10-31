# v0.7.0 validation — historical plan drawings

## Scope

This release adds an optional, bounded history overlay for qualified plans. It draws the planned entry, initial stop and TP1–TP3 from the confirmed plan bar; it does not backdate to a pivot. `Recent plans` retains the configured number of plans. `Full bounded` also applies a lookback in loaded bars. At most ten plans are held, keeping object usage bounded. The chart dashboard, context-history labels and trade calculations remain separate.

No entry/exit predicate, score, alert, broker adapter or backend source was changed. Historical drawings are created after the shared signal engine and cannot send orders or alerts. On plan closure, the entry tag records the terminal script status; this does not identify an exact TP/SL cause or prove a broker fill.

## Verification

- Node 22 clean install (`npm ci`) completed; npm reported **0 vulnerabilities**.
- `npm run verify`: **90 tests in seven files passed**, including strict TypeScript, generated-source consistency and the independent Pine parser.
- A new regression test checks that history settings are inputs only and that historical drawing code remains in the visual module, uses confirmed bars, is bounded, and contains no order/alert calls.
- Exact final generated indicator and strategy sources compiled in TradingView Pine Editor with no compiler error. The indicator was added temporarily; the strategy could not be added because TradingView Basic hit its study limit. The installed v0.6.0 strategy was kept unchanged. Indicator source SHA-256: `2cd3bae529007fbe3df7f76346e8ace9fed9dc2c367fa17c45c05fa9d35cdc61`. Strategy source SHA-256: `b6589977668cfceb7017dcd10a3af48a58eb25063d8299a1207175b3e57e6f5b`. Validation source is unchanged: `2e108810e1794578c245ea272b00b45afff68090996e005d0ea40c254debd07e`.
- A temporary synthetic-only chart probe compiled and rendered five plan price lines and five labels using the final 12-bar spacing. The labels remained separate from one another, though they can still visually intersect nearby context markers. This forced plan is a UI test, not a market signal.
- The current FOREX.com XAUUSD M5 chart contains the compiled v0.7.0 indicator alongside the user’s existing studies; the installed backtest strategy remains v0.6.0. A TradingView Save attempt was blocked by the Basic plan’s one-saved-script limit, so the Pine source is not saved as a durable TradingView script. The user screenshot also showed an offline banner; this browser session later appeared online, but cloud script persistence is still blocked by the plan limit.
- The remote `main` ref still matched the prior v0.6.1 commit at review time. This v0.7.0 worktree is uncommitted. `.env` is ignored and is not tracked; no token pattern was found in scanned project files outside ignored environment files. Environment variable values were not read or logged.
- A Telegram bot credential was pasted into this conversation earlier. Revoke it with BotFather and replace the Vercel environment value before using the bot again. This was not done from the local project.

## A–H audit and parity coverage

The operational descriptions and candidate-generation source were reviewed for modules A–H (E has separate demand and supply candidates). The Pine validation harness contains **107 synthetic assertions** for the modules’ pure setup predicates, shared risk gates, and state labels. These are deterministic examples, not full historical-candle replays of every candidate lifecycle.

The captured native event fixtures are uneven: the current fixture contains 67 B_CRT indicator-estimate events; the older v0.6 fixture contains six A_SWEEP_MSS_FVG events. There are no native event fixtures for C, D, E demand/supply, F, G, or H. A source-normalization test verifies that the indicator and strategy share the same analysis/confirmation engine after their execution adapters are removed. This is structural parity only; no matched historical event-by-event comparison was run.

## What remains unverified

- The current loaded chart/settings did not produce a qualified historical plan. The final spacing was verified only with the synthetic UI probe, not with a real qualified signal.
- No deterministic full-state OHLC fixtures have been added for all A–H modules. The earlier 107 native assertions cover shared pure predicates and gates, not every candidate lifecycle.
- No v0.7.0 32-case strategy matrix, comprehensive indicator/strategy event parity, Bar Replay non-repaint run, multiple-feed cost stress, untouched OOS, walk-forward or demo-forward test was performed. Earlier v0.6.0 historical results are not new v0.7 evidence.
- The updated strategy compiled in Pine Editor, but TradingView Basic refused to add it after reaching its study limit. The already-installed v0.6.0 strategy remained on the chart, and no new Strategy Tester result was established.
- No Vercel deployment, native TradingView-to-Telegram event, or Telegram test was performed. Backend source is unchanged from v0.6.1. The current Pine source is available in the local project but has not been saved to TradingView because of the account limit.

The strategy concepts remain explicit price-action approximations, not universally agreed labels. The project remains research/demo-evaluation software; no profitability, live-readiness or win-rate claim is supported.
