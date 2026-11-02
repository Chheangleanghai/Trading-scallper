# Single-plan parity review — 2026-10-12

## Evidence and verdict

The raw copied Pine Logs are preserved in `reports/tradingview-v080-indicator-logs.txt` (SHA-256 `0dddd3879c19f7246cc0f598b0fea0c939c969ec0a069d6f082ad336030c50e2`) and `reports/tradingview-v080-strategy-logs.txt` (SHA-256 `88b7456fea582e454b55e6f6ad51a381ee9ebdc373eb53080eee5011c5e61bef`). They are outside this directory but were parsed in place; neither file was modified.

**Result: `SINGLE_PLAN_MATCH`, tolerance 0.** The current comparator returned one Indicator plan and one Strategy plan, `parity: true`, zero planned-field mismatches. The Strategy `PLAN_AUDIT` row itself lacks `symbol` and `timeframe`; these two values were joined from its matching `BUY_SIGNAL` record in the same raw log file for comparison. The log file was not backfilled. This is a one-plan result only, not multi-plan parity.

| Planned field | Indicator | Strategy | Match |
| --- | ---: | ---: | :---: |
| Plan timestamp | 1791802500000 | 1791802500000 | Yes |
| Setup timestamp | 1791799200000 | 1791799200000 | Yes |
| Direction / module | BUY / A_SWEEP_MSS_FVG | BUY / A_SWEEP_MSS_FVG | Yes |
| Entry mode | Close | Close | Yes |
| Entry | 4177.48 | 4177.48 | Yes |
| SL | 4170.88 | 4170.88 | Yes |
| TP1 / TP2 / TP3 | 4184.08 / 4190.68 / 4197.28 | 4184.08 / 4190.68 / 4197.28 | Yes |
| Quality / execution accepted | 100 / true | 100 / true | Yes |

The plan timestamp is `2026-10-12 10:55:00 UTC`; setup timestamp is `2026-10-12 10:00:00 UTC`. Planned parity is distinct from execution: Indicator model is `INDICATOR_ESTIMATE` with filled entry 4177.48; Strategy model is `STRATEGY_EMULATOR` with filled entry 4177.50. Strategy fill is 0.02 above the planned entry. No P&L conclusion is drawn.

## Log-prefix times versus payload times

TradingView documents that historical Pine Logs prefixes represent the bar's opening time in the chart timezone, while the Pine source payload uses UNIX millisecond timestamps. In these logs the chart timezone is UTC (`-00:00`). The source assigns plan `timestamp` from `signalTime`, which is set to `time_close`; lifecycle payloads retain that original signal timestamp and separately set `eventTimestamp` from the current `time_close`.

| Event | Indicator log prefix / `eventTimestamp` | Strategy log prefix / `eventTimestamp` |
| --- | --- | --- |
| PLAN_AUDIT | 10:50 / no eventTimestamp | 10:50 / no eventTimestamp |
| BUY_SIGNAL | 10:50 / 10:55 | 10:55 / 11:00 |
| TRADE_CLOSED | 11:05 / 11:10 | 11:10 / 11:15 |

All times are UTC on 2026-10-12. The five-minute difference between a historical log prefix and its payload close timestamp is expected: prefix is bar-open time; payload `eventTimestamp` is bar-close time. The BUY_SIGNAL and TRADE_CLOSED events also differ between Indicator and Strategy by one M5 bar in both the prefixes and payload event times; that difference is not explained solely by display-time formatting.

## Execution timing assessment

The Strategy source declares `process_orders_on_close=false`, `calc_on_every_tick=false`, and `calc_on_order_fills=false`. The market entry is created after the confirmed plan bar; TradingView's broker emulator can first fill a bar-close order at the next available tick, normally the following bar's open. With calculations once per bar close and no fill recalculation, the source only observes the opening fill on a later bar calculation and then calls `notifyEntry`. This supports the observed delayed Strategy BUY_SIGNAL without indicating a bug. The source also declares `slippage=2`; the 0.02 price difference could reflect next-bar open and configured slippage, but actual bar open, tick size, and active Strategy Properties are unavailable, so the precise contribution is unverified.

The close delay is also consistent with the different models, but its cause is not established. Indicator closure is an OHLC-touch estimate. Strategy lifecycle logging waits until a calculation observes `strategy.closedtrades`; `strategy.close(..., immediately=false)` is also deferred by the emulator. If the unchanged `timeExit=15` input caused closure, the signal/fill timing here could produce an Indicator close at 11:10 and a Strategy close notification at 11:15 while the emulator close fills on the next tick. The logs do not include exit time, close reason, exit price, or realized P&L, and no run-context/settings capture confirms that `timeExit` was 15 or that another exit had not occurred. Treat this as a plausible explanation, not a verified execution-parity result.

## Gate limits and next evidence

- The logs declare `scriptVersion` 0.8.0, but contain no source hash or verified active-draft identity. Strategy PLAN_AUDIT also omits symbol/timeframe; the matching lifecycle record supplies them for this comparison.
- The files do not record actual Pine inputs, Strategy Properties overrides, or the effective research date-window setting. The Pine source defaults to `useResearchWindow=false` and a 2026-01-01 through 2027-01-01 window, but runtime settings may differ. Therefore this result does not pass a formal source-and-settings-attributed parity gate.
- Obtain fresh raw logs from current hash-matched instances and a capture of actual inputs/date range, with at least two common plans before reporting multi-plan parity. Then run controlled Bar Replay/reload and preserve before/after logs plus candle-by-candle notes.
- No Strategy Tester trade export for this plan was supplied here; do not infer profit, loss, or profitability from the close event.

Reference: [TradingView Pine Logs](https://www.tradingview.com/pine-script-docs/writing/debugging/) and [TradingView strategy order processing](https://www.tradingview.com/pine-script-docs/concepts/strategies/).
