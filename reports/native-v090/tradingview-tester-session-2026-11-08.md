# TradingView Strategy Tester session — 2026-11-08

## Native chart and cleanup

- Chart: `FOREXCOM:XAUUSD`, 5-minute candles, chart display timezone UTC+7 (WIB).
- Temporary script: `XAUUSD SMART SCALPER PRO Backtest · A-H Research diagnostics`.
- The temporary Strategy was attached and its Strategy Tester was inspected, then removed with TradingView Undo. The original `XAUUSD SMART SCALPER PRO · A-H Confirmation review` Indicator remained attached. No chart save, live order, alert, Telegram message, or deployment was performed.
- The bounded native pair review is documented separately in `tradingview-native-paired-review-2026-11-08-repeat.md`; this session does not change that two-plan comparison.

## Strategy Tester snapshot

TradingView displayed the date range **Oct 12, 2026 — Nov 7, 2026**, with initial capital **$10,000 USD**. The visible summary reported:

| Displayed metric | Value |
| --- | ---: |
| Net P&L | −$96.02 (−0.96%) |
| Gross profit | $282.25 |
| Gross loss | $378.27 |
| Profit factor | 0.746 |
| Maximum drawdown | $216.24 (2.15%) |
| Profitable displayed trades | 43.48% (50/115) |
| Losing displayed trades | 65/115 |
| Expectancy | −$0.83 / −0.01% per displayed trade |

TradingView showed 115 **closed-trade rows**. Rows can represent partial exits from one position, so 115 is not established as the number of unique completed positions. The displayed win rate and expectancy are therefore row-level Tester metrics, not a de-duplicated position-level analysis. No conclusion about future or out-of-sample profitability follows from this historical display.

One visible example confirms why rows must be grouped: B_CRT short rows 8 and 9 share entry time **Oct 14, 2026 22:35** and entry price **4,089.69**. Row 8 records `TP1_HIT`, size 0.6, net +$3.82; row 9 records `TRADE_CLOSED`, size 1.5, net +$9.51. Together these displayed legs total 2.1 units and +$13.33 net for that apparent position. The row export needed to group and audit all trades was unavailable.

## Effective Strategy Properties observed

- Initial capital: $10,000 USD.
- Default order size: 100% of equity; script submits explicit quantities.
- Pyramiding: 0.
- Commission: 0.01%.
- Slippage: 2 ticks.
- Bar detail: Default (4 ticks per bar).
- Script execution: On bar close.
- Long and short leverage: 1×.
- Limit order execution: Requested price.
- Order execution delay: One tick.

Visible script inputs included all A–H modules enabled, date window disabled, London session filter, close entry mode, 15-minute maximum holding time, fixed-R targets, structure stop, 0.5% risk, 90% maximum simulated notional/equity, partial exits enabled, and 2R minimum TP2 reward/risk. These are UI-observed settings for this run, not a reusable signed settings export.

## Access limits and verification status

- Clicking the Tester CSV download surfaced TradingView's Basic-plan gate stating trade CSV export requires an upgrade. The user previously chose not to upgrade, so no upgrade was attempted.
- Intraday Strategy Bar Replay was blocked on Basic in the earlier native attempt. No Replay/non-repainting claim is made.
- This full-range summary is not a raw trade file and cannot supply per-position exit IDs, comments, commission sums, module-level outcomes, or unique-position counts.
- The fresh visible Tester summary is separate from the bounded paired diagnostic capture. It must not be combined with that capture's two positions as if they were one sample.
- The temporary Strategy was removed and chart state visually returned to the original A–H Indicator view. No saved layout was changed.

## Source preservation

SHA-256 values checked after the native session:

| Source | SHA-256 |
| --- | --- |
| Frozen baseline `pine/indicator.pine` | `c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4` |
| Frozen baseline `pine/strategy.pine` | `42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0` |
| Experimental Indicator wrapper | `f0d18fa043486005546b0b304b95a0b9db94fd08b598f4f146410d4079dfe852` |
| Experimental Strategy wrapper | `8ded3b423e6f6370c7fa7a0f2c4e35d55039d03450968907ab2226828f311b9d` |

The baseline source files were not edited. `git diff --check` passed after this report was added. The previously run `npm run verify` passed: typecheck, 27 test files / 238 tests, generated Pine checks, diagnostic source-hash checks, and independent parsing of 31 Pine files. That local verification does not compile Pine in TradingView or prove Replay behavior.

## Highest-value next evidence

Use a trade export if one becomes available without changing the user's plan choice, or provide a full native export manually. Group all exit rows by position identity, reconcile quantities, exit reasons and costs, and preserve the TradingView settings snapshot. Until then, the position-level full-period results remain unknown.
