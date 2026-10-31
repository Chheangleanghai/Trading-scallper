# TradingView setup

1. Open your broker's XAUUSD symbol on a standard M1 or M5 candle chart. M3/M15 also supported. Synthetic charts are rejected. Prices, pip values and broker lots are never hardcoded.
2. First paste `pine/validation.pine` into Pine Editor, save and Add to chart. It currently contains 107 synthetic assertions over shared pure predicates, safety gates, and state labels. It raises a runtime error if an assertion fails and displays a success table only after execution. These assertions do not replay the complete candidate engine or prove profitability.
3. Separately compile/save/add `pine/indicator.pine` and `pine/strategy.pine`. No published library is required. **The project scripts have been compiled in the connected TradingView session.** Recompile after local edits; the local parser is not a replacement for TradingView. Review compiler warnings too.
4. Start with Strategy A enabled alone. B–H default off. Exact definitions, score allocations, competing-candidate rules and stops/targets are in STRATEGIES.md. For isolated evaluation, turn A off and enable one other module. Each still passes common safety/risk filters; lack of qualifying signals is valid.
5. Setup and execution timeframes equal the active chart. H1 is completed-candle EMA context; M15 is completed-pivot structure. Requests use expression offsets with lookahead_on. CRT's selectable reference TF must be >= chart TF. An M5 chart does not reconstruct M1 entries.
6. Choose session preset: Asian (09:00–18:00 Asia/Tokyo), London (08:00–17:00 Europe/London), New York (08:00–17:00 America/New_York), overlap, all major sessions, or custom. Overlap requires **both local windows** simultaneously, correctly handling mismatched UK/US DST weeks. Custom uses its session and IANA timezone inputs. Presets use their fixed IANA zones, regardless of custom timezone input. These are configurable operating windows, not claims of a universal session definition. Session plan cap resets on a transition into the selected window; a 24-hour custom window resets at custom-zone midnight.
7. Manual news pause blocks new plans and cancels pending orders, while active protective exits remain. An exclusion interval blocks any chart bar overlapping it; no news feed is fetched. Input timestamps are absolute times shown by TradingView's UI timezone. A permanent manual pause is also available.
8. Configure targets/stops and optional management deliberately. Fixed R is a projection. Structure requires three distinct known opposing levels; Hybrid falls back to fixed projections and labels this. Break-even/trailing default off. Initial SL stays fixed; managed SL can only tighten after confirmed closes.
9. Create an alert using **Any alert() function call** on the indicator. Webhook URL: `https://YOUR_PROJECT.vercel.app/api/webhook/YOUR_HIGH_ENTROPY_SECRET`. No Telegram credentials belong in Pine or TradingView. Check current TradingView plan and 2FA requirements for webhooks.
10. Recreate alert snapshots after script/input/symbol/timeframe changes. Historical calculations do not deliver old alerts. Follow TELEGRAM_SETUP.md for backend configuration and TESTING.md for delivery acceptance.

Use one notification stream: indicator estimates **or** strategy emulator events. For strategy alerts, choose only `alert()` calls, not generic order-fill placeholders. Strategy JSON identifies `STRATEGY_EMULATOR`; indicator JSON identifies `INDICATOR_ESTIMATE`. Both are chart simulations, not real broker fills. Pending plans send no BUY/SELL until modeled/actual emulator trigger. Strategy market orders usually fill at next-bar open, and strategy fill events are reported when that bar closes.

Chart inputs can hide EMAs, individual entry/SL/TP labels/lines, boxes, FVG/OB, structure markers and context overlays. Latest plan only receives full trade boxes. Developing chart context is not a confirmed trade. No entry marker is plotted on a past pivot bar.

Official references: [confirmed HTF data](https://www.tradingview.com/pine-script-docs/concepts/repainting/), [strategy fills and exit reservations](https://www.tradingview.com/pine-script-docs/concepts/strategies/), [JSON webhooks and three-second timeout](https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/).

## Account limits observed during testing

The connected Basic account reported limits of one saved script and two applied studies. Existing saved scripts were preserved; no upgrade or publication was performed. Temporary drafts and a separate chart tab with autosave disabled were used for isolated evaluation. To install permanently alongside other studies, use an available slot or a suitable account plan. Local source files remain the authoritative deliverable. Never overwrite a saved user script merely to work around a plan limit.

## Updating to v0.3.0

Use the regenerated `pine/indicator.pine` and `pine/strategy.pine` files. Research filters default to disabled/Both, preserving the previous selection defaults. Run `pine/validation.pine`; the current harness shows **107 synthetic assertions** when they pass. Keep the research window disabled for ongoing demo alerts unless deliberately restricting dates.

TradingView stores an independent snapshot when creating a script alert. Updating chart source or inputs does not update an existing running alert. After reviewing this release, recreate the indicator alert using **Any alert() function call**, your existing private webhook URL and the chosen inputs. Do not include the Telegram bot token in that URL or Pine. Avoid leaving the old and new alerts running together. See [TradingView's alert snapshot documentation](https://www.tradingview.com/pine-script-docs/faq/alerts/). Existing webhook payload fields and event names are unchanged; no backend upgrade is required for these Pine changes.

## Readability controls (v0.3.1)

Under Settings → Inputs → Readability, choose Small / Normal / Large dashboard and chart label text. Defaults use Normal text, hide detailed swing labels, retain 15 recent structure annotations and omit strategies with no completed trades from the backtest table. Enable “Show previous trade prices when no current plan” only when reviewing historical plans. This is a display-only upgrade; existing alert message formats and trading rules are unchanged.

## Reference layout (v0.4.0)

Select Settings → Inputs → Chart style → Reference (default) for the supplied-image style. Choose Dashboard to restore the full signal/performance panels. Reference shows a compact context legend and visual EMA55; all strategy calculations still use their existing EMA inputs/rules. Turn individual overlays on/off and adjust sweep-label spacing under Chart style. Font sizes and historical label counts remain under Readability. The exact annotation definitions are in [V040_REFERENCE_UI.md](reports/V040_REFERENCE_UI.md).

## Smaller, lighter UI and audit (v0.5.0)

Readability now defaults to Small text and 82% context-label background transparency, with dark text and a light dashboard. Tiny remains optional. The compact reference panel is middle right so its New signal gate row stays clear of the watermark. That row explains common blockers; it does not bypass candle-close or risk confirmation.

This release changes structure/QM analysis, so recreate an existing indicator alert after loading the new source to use the updated rules. Existing alerts retain their earlier script/input snapshot. Use Any alert() function call and your existing private webhook URL; backend deployment and Telegram environment variables are unchanged.

## Misaligned overlays / separate price scale

If an EMA value is numerically above price but its line appears below the candles, check price-scale assignment. Pin this script to the same scale as the main XAUUSD candles, enable Auto if needed, and save the layout. Reload to verify persistence. Do not try to correct a scale mismatch by changing EMA periods, broker prices or signal rules.

Maintainers replacing serialized source IDs must also repair scale associations with `scripts/chart_layout.mjs`; source-only replacement is unsafe. See [the confirmed scale repair](reports/V051_SCALE_REPAIR.md). This layout-only fix does not require recreating alerts.

## v0.6.0 chart upgrade

Final native indicator/strategy compilation and the saved FOREX.com M5 strategy chart were verified on 31 October 2026. The clean layout uses Small text, light label backgrounds, Latest only annotation history and CRT context labels off. These display settings do not disable the CRT trading module or safety gates. WAIT explains the current missing prerequisite; READY means a qualified pending order, not a confirmed fill. A counter-H1 CHoCH is context, not a BUY/SELL instruction.

Existing alerts retain their old script/input snapshot. Recreate the intended alerts after reviewing the upgraded chart; no existing alerts were modified during this release. New explanation fields also require deploying the updated backend. Only the manual TEST relay has confirmed Telegram receipt; native live-alert origination remains unverified. See reports/V060_VALIDATION.md for exact evidence and limitations.
