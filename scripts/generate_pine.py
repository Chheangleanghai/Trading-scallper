from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
engine = (root/'pine/engine.pine.inc').read_text()
for token, file, indent in [
    ('// INCLUDE_PREDICATES', 'predicates.pine.inc', ''),
    ('// INCLUDE_MODULE_CANDIDATES', 'candidates.pine.inc', ''),
    ('// INCLUDE_CONTEXT_DEFINITIONS', 'context.pine.inc', ''),
    ('    // INCLUDE_CONTEXT_UPDATE', 'context_update.pine.inc', '    '),
    ('// INCLUDE_MODULE_FUNCTIONS', 'update.pine.inc', ''),
    ('// INCLUDE_DECISION_VIEW', 'decision_view.pine.inc', ''),
    ('// INCLUDE_REFERENCE_VISUALS', 'reference_visuals.pine.inc', ''),
    ('    // INCLUDE_PIVOT_CONTEXT', 'pivots.pine.inc', '    '),
]:
    source = (root/'pine/modules'/file).read_text()
    included = '\n'.join(indent + line if line else '' for line in source.splitlines())
    if engine.count(token) != 1:
        raise SystemExit(f'Expected exactly one {token}')
    engine = engine.replace(token, included)
indicator = '//@version=6\nindicator("XAUUSD SMART SCALPER PRO", overlay=true, max_labels_count=200, max_lines_count=100, max_boxes_count=20)\n' + 'bool brokerBusy = false\nbool useBroker = false\n' + engine
broker_sync = (root/'pine/modules/broker_sync.pine.inc').read_text()
indented_sync = '\n'.join('    ' + line if line else '' for line in broker_sync.splitlines())
orders = (root/'pine/modules/orders.pine.inc').read_text()
strategy = '//@version=6\nstrategy("XAUUSD SMART SCALPER PRO Backtest", overlay=true, pyramiding=0, initial_capital=10000, currency=currency.USD, commission_type=strategy.commission.percent, commission_value=0.01, slippage=2, process_orders_on_close=false, calc_on_every_tick=false, calc_on_order_fills=false, max_labels_count=200, max_lines_count=100, max_boxes_count=20)\n' + 'bool brokerBusy = strategy.position_size != 0\nbool useBroker = true\n' + engine.replace('    // BROKER_SYNC', indented_sync).replace('// STRATEGY_ORDER_ADAPTER', orders) + '\n' + (root/'pine/modules/performance.pine.inc').read_text()
fixtures = '//@version=6\nindicator("Smart Scalper synthetic assertions", overlay=true)\n' + (root/'pine/modules/predicates.pine.inc').read_text() + '\n' + (root/'pine/fixtures.pine.inc').read_text()
for name, content in [('indicator.pine', indicator), ('strategy.pine', strategy), ('validation.pine', fixtures)]:
    target = root/'pine'/name
    if '--check' in sys.argv:
        if not target.exists() or target.read_text() != content:
            raise SystemExit(f'{name} differs: run npm run pine:generate')
    else:
        target.write_text(content)
