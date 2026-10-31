# v0.6.1 code review — 31 October 2026

This patch changes backend validation only. The Pine indicator/strategy remain byte-identical to the natively compiled v0.6.0 sources and the installed chart is unchanged. Production has not been redeployed; no messages or broker orders were sent during this review.

## Finding fixed

The webhook checked the status enum without checking its relationship to an entry event. An authenticated payload such as BUY_SIGNAL + ENTRY_PENDING could pass validation and be formatted as a BUY notification. No such payload was found in the captured native fixtures, but accepting it was a validation gap.

When status is provided, BUY_SIGNAL/SELL_SIGNAL now require CONFIRMED or ENTRY_TRIGGERED; ENTRY_TRIGGERED events require ENTRY_TRIGGERED status. Legacy senders without status remain compatible. Legacy CONFIRMED payloads do not prove fills. The relay still does no trading analysis, broker execution or durable deduplication.

New regression checks cover six non-entry statuses for both directions, rejection before network access, legacy/confirmed compatibility and contradictory ENTRY_TRIGGERED metadata.

## Verification

- Node22 `npm run verify`: **89 tests in seven files passed**, TypeScript, generation and independent parse checks included.
- All 67 earlier native payloads and six actual v0.6.0 payloads still pass backend fixtures.
- Current Pine SHA256 values match v0.6.0 native compilation evidence; no new native compilation or matrix was needed for this backend-only patch.
- Earlier v0.6.0 evidence remains 107 native predicate assertions and 32 historical module/timeframe cases: 24 negative, seven positive, one without trades. This is not a trade win rate or proof of a profitable edge.

## Review scope and limits

Reviewed entry stages, candidate maintenance, confirmed HTF requests/pivots, target selection, stop management, order sizing/partial exits, broker synchronization, performance grouping, drawing lifecycle, JSON serializer, authentication, payload validation, Telegram escaping/deadline and Vercel routing. Static review plus finite tests cannot establish that every possible state or discretionary pattern interpretation is correct.

- Signals use confirmed closes; strategy fill notifications can arrive a bar after the modeled fill. They can be too late for the same price in manual live trading.
- Minimum R and risk are checked against the planned entry. Gaps/slippage can change actual filled risk/R; a simulation is not a live execution guarantee.
- OHLC does not resolve intrabar ordering. Indicator estimates and the broker emulator can differ. The one matching default-A planned signal is not comprehensive native parity.
- Transaction assumptions are example commission/slippage, not measured historical bid/ask spreads. Other broker feeds, contract metadata and account currencies need separate evaluation.
- The inspected historical sample is development evidence. Genuine OOS, walk-forward and demo forward testing remain incomplete. No tuning was performed to manufacture a higher win rate.
- Manual relay TEST receipt was confirmed by the user. Native TradingView-origin delivery through the upgraded deployed backend remains unverified; existing alerts retain snapshots.

## Next acceptance work

1. Deploy the reviewed backend patch to apply the guard in production; its present success is local only.
2. Recreate one intended v0.6.0 alert stream and verify native entry and lifecycle events through the deployed relay on realtime data. Do not infer this from historical logs or the earlier manual POST.
3. Freeze source/settings before new chronological evaluation; include broker costs and gap/partial-fill cases, then demo forward-test.
4. Expand native signal parity across strategies and entry modes before claiming full equivalence.

No current evidence supports calling the complete system 100% correct or live-ready.
