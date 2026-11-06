"""Isolated display/closure-telemetry review. Frozen trading parents are unchanged."""
from pathlib import Path
from hashlib import sha256
import sys

ROOT = Path(__file__).resolve().parents[1]
PARENTS = {
    'indicator': '050518694b7d83a112dc22e40e1072621f7884cc89b526b29995532131f0ad1b',
    'strategy': 'eb601426b7a71779cd0aee0f56f987a6cf723cf48b23131aa29d9214913f4851',
}
INPUTS = """// REVIEW_INPUTS_BEGIN
reviewShowBoard = input.bool(true, 'Show A–H confirmation board', group='Concept review')
reviewShowGuides = input.bool(true, 'Show candidate zones / triggers (setup only)', group='Concept review')
// REVIEW_INPUTS_END
"""
DECLARATIONS = """// REVIEW_PATTERN_STATE_BEGIN
type ReviewPattern
    int setupTime = na
var ReviewPattern reviewQm = ReviewPattern.new()
var array<int> reviewQmBars = array.new<int>()
var array<float> reviewQmPrices = array.new<float>()
// REVIEW_PATTERN_STATE_END
"""
PATTERN = """                // REVIEW_PATTERN_CAPTURE_BEGIN
                array.clear(reviewQmBars)
                array.clear(reviewQmPrices)
                for reviewIndex = 0 to 4
                    array.push(reviewQmBars, array.get(pivotTimes, reviewIndex))
                    array.push(reviewQmPrices, array.get(pivotPrices, reviewIndex))
                reviewQm.setupTime := candH.setupTime
                // REVIEW_PATTERN_CAPTURE_END
"""
ESTIMATE = """                // REVIEW_ESTIMATE_CAPTURE_BEGIN
                reviewOutcome.planTime := signalTime
                reviewOutcome.closeTime := time_close
                reviewOutcome.code := reviewCloseCode(stopped, third, timed)
                reviewOutcome.price := na
                reviewOutcome.net := na
                reviewOutcome.accountCurrency := ''
                // REVIEW_ESTIMATE_CAPTURE_END
"""
EMULATOR = """            // REVIEW_EMULATOR_CAPTURE_BEGIN
            int reviewLast = strategy.closedtrades - 1
            if strategy.closedtrades.entry_id(reviewLast) == selectedStrategy and strategy.closedtrades.entry_time(reviewLast) == fillTime
                int reviewExitTime = strategy.closedtrades.exit_time(reviewLast)
                string reviewExitId = strategy.closedtrades.exit_id(reviewLast)
                string reviewComment = strategy.closedtrades.exit_comment(reviewLast)
                // The parent's sole strategy.close call is the holding-time condition.
                bool reviewTimedOrder = reviewComment == 'TRADE_CLOSED' and str.startswith(reviewExitId, 'Close entry(s) order') and timeExit > 0 and reviewExitTime - fillTime >= timeExit * 60000
                float reviewNet = 0
                for reviewRow = reviewLast to 0
                    if strategy.closedtrades.entry_id(reviewRow) != selectedStrategy or strategy.closedtrades.entry_time(reviewRow) != fillTime
                        break
                    reviewNet += strategy.closedtrades.profit(reviewRow)
                reviewOutcome.planTime := signalTime
                reviewOutcome.closeTime := reviewExitTime
                reviewOutcome.code := reviewExitCode(reviewComment, reviewTimedOrder)
                reviewOutcome.price := strategy.closedtrades.exit_price(reviewLast)
                reviewOutcome.net := reviewNet
                reviewOutcome.accountCurrency := strategy.account_currency
            // REVIEW_EMULATOR_CAPTURE_END
"""


def replace_once(source, old, new):
    assert source.count(old) == 1, old[:100]
    return source.replace(old, new, 1)


def generate(kind):
    parent = ROOT / f'pine/experiments/{kind}_professional.pine'
    raw = parent.read_bytes()
    if sha256(raw).hexdigest() != PARENTS[kind]:
        raise SystemExit(f'{parent.name}: unknown parent; refusing generation')
    source = raw.decode()
    source = replace_once(source, ' · A-H Plan candidate"', ' · A-H Confirmation review"')
    source = replace_once(source, 'max_lines_count=100, max_boxes_count=20', 'max_lines_count=150, max_boxes_count=60')
    source = replace_once(source, '// CLEAR_SIGNAL_INPUTS_BEGIN\n', INPUTS + '// CLEAR_SIGNAL_INPUTS_BEGIN\n')
    source = replace_once(source, "chartLabelSize = input.string('Normal',", "chartLabelSize = input.string('Small',")
    source = replace_once(source, "dashboardSize = input.string('Small',", "dashboardSize = input.string('Tiny',")
    source = replace_once(source, 'updateCandidates() =>\n', DECLARATIONS + 'updateCandidates() =>\n')
    source = replace_once(source, '                memory.qmUsed := patternKey\n', PATTERN + '                memory.qmUsed := patternKey\n')
    source = replace_once(source, 'event(string kind) =>\n', (ROOT / 'pine/experiments/confirmation_outcome.pine.inc').read_text() + 'event(string kind) =>\n')
    source = replace_once(source, "+ (na(filledEntry) ? 'null' : str.tostring(filledEntry, format.mintick)) + '}'", "+ (na(filledEntry) ? 'null' : str.tostring(filledEntry, format.mintick)) + reviewOutcomeJson(kind, signalTime) + '}'")
    source = replace_once(source, "                active := false\n                notifyLifecycle('TRADE_CLOSED')", "                active := false\n" + ESTIMATE + "                notifyLifecycle('TRADE_CLOSED')")
    if kind == 'strategy':
        source = replace_once(source, "            status := 'CLOSED'\n            notifyLifecycle('TRADE_CLOSED')", "            status := 'CLOSED'\n" + EMULATOR + "            notifyLifecycle('TRADE_CLOSED')")
    start = source.index('// CLEAR_SIGNAL_DRAWINGS_BEGIN')
    end = source.index('// CLEAR_SIGNAL_DRAWINGS_END\n', start) + len('// CLEAR_SIGNAL_DRAWINGS_END\n')
    source = source[:start] + (ROOT / 'pine/experiments/confirmation_levels.pine.inc').read_text() + source[end:]
    start = source.index('// CLEAR_SIGNAL_BADGE_BEGIN')
    source = source[:start] + (ROOT / 'pine/experiments/confirmation_badge.pine.inc').read_text() + '\n' + (ROOT / 'pine/experiments/confirmation_concepts.pine.inc').read_text()
    return source


if __name__ == '__main__':
    for kind in PARENTS:
        content = generate(kind)
        output = ROOT / f'pine/experiments/{kind}_confirmation_review.pine'
        if '--check' in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f'{output.name}: regenerate confirmation candidates')
        else:
            output.write_text(content)
        print(output.name, sha256(content.encode()).hexdigest())
