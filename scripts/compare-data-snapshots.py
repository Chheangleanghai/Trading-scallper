#!/usr/bin/env python3
"""Compare observation-only Pine DATA_SNAPSHOT_AUDIT exports without filling gaps.

Exit codes: 0=data/state match (metadata may differ), 1=changed/missing snapshots,
2=invalid intake. Decimal JSON fractions are compared exactly and rendered as
strings in detail fields so the receipt does not silently round their precision.
"""
import argparse
import csv
from decimal import Decimal
import hashlib
import io
import json
from pathlib import Path
import re
import sys

MARKER = 'DATA_SNAPSHOT_AUDIT'
TARGET_OPEN = 1793785800000
CONTEXT = ('schema', 'parentSourceSha256', 'scriptVersion', 'symbol', 'timeframe', 'windowBasis')
CATEGORIES = {
    'rawOhlc': ('open', 'high', 'low', 'close'),
    'rawMarketContext': ('volume', 'mintick'),
    'derivedContext': ('atr', 'atrMean', 'ema9', 'ema21', 'ema50', 'h1CompletedClose', 'h1CompletedEMA50', 'hTrend', 'mTrend', 'crtTime', 'crtHigh', 'crtLow', 'pdh', 'pdl', 'pwh', 'pwl', 'swingHigh', 'swingLow', 'swingHighBar', 'swingLowBar', 'chartStructure', 'inSession', 'volatilityAllowed', 'paused'),
    'executionState': ('aStage', 'direction', 'active', 'pending', 'brokerBusy', 'cancelOrder', 'slotAvailable', 'sessionTrades', 'maximumPlans', 'lastSignalBar', 'cooldownBars', 'signalTime', 'signalBar', 'fillBar', 'selectedStrategy', 'status', 'decisionReason'),
    'candidates': ('candidates',),
    'plan': ('plan',),
    'historyBoundary': ('firstLoadedBarTime', 'barIndex'),
    'metadata': ('lastBarIndex',),
}
REQUIRED = set(CONTEXT) | {'time', 'timeClose'} | {field for fields in CATEGORIES.values() for field in fields}
BOOLEANS = {'inSession', 'volatilityAllowed', 'paused', 'active', 'pending', 'brokerBusy', 'cancelOrder', 'slotAvailable'}
NULLABLE_INTS = {'crtTime', 'swingHighBar', 'swingLowBar', 'lastSignalBar', 'signalTime', 'signalBar', 'fillBar'}
INTS = {'time', 'timeClose', 'barIndex', 'lastBarIndex', 'firstLoadedBarTime', 'hTrend', 'mTrend', 'chartStructure', 'aStage', 'direction', 'sessionTrades', 'maximumPlans', 'cooldownBars'}
TEXT = set(CONTEXT) | {'selectedStrategy', 'status', 'decisionReason'}
NUMBERS = REQUIRED - BOOLEANS - NULLABLE_INTS - INTS - TEXT - {'candidates', 'plan'}
CANDIDATE_IDS = {'A_SWEEP_MSS_FVG', 'B_CRT', 'C_TURTLE_SOUP', 'D_SNR', 'E_DEMAND', 'E_SUPPLY', 'F_TREND_PULLBACK', 'G_AMD', 'H_QUASIMODO'}
CANDIDATE_FIELDS = {'id', 'enabled', 'stage', 'direction', 'ready', 'setupBar', 'setupTime', 'confirmationTime', 'trigger', 'lower', 'upper', 'invalidation', 'plannedEntry', 'quality', 'status', 'rejection'}
PLAN_FIELDS = {'timestamp', 'setupTimestamp', 'strategy', 'direction', 'entryMode', 'entry', 'sl', 'tp1', 'tp2', 'tp3', 'quality'}


class IntakeError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise IntakeError(message)


def number(value):
    return (type(value) is int) or (isinstance(value, Decimal) and value.is_finite())


def pairs_no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f'Duplicate JSON field {key}')
        result[key] = value
    return result


def invalid_constant(value):
    raise IntakeError(f'Invalid JSON number {value}')


def validate_record(row, location):
    require(type(row) is dict, f'{location}: snapshot must be an object')
    require(set(row) == REQUIRED, f'{location}: missing fields {sorted(REQUIRED - set(row))}; unexpected fields {sorted(set(row) - REQUIRED)}')
    for field in BOOLEANS:
        require(type(row[field]) is bool, f'{location}: invalid boolean {field}')
    for field in INTS:
        require(type(row[field]) is int, f'{location}: invalid integer {field}')
    for field in NULLABLE_INTS:
        require(row[field] is None or type(row[field]) is int, f'{location}: invalid nullable integer {field}')
    for field in NUMBERS:
        require(row[field] is None or number(row[field]), f'{location}: invalid number {field}')
    for field in TEXT:
        require(type(row[field]) is str and (bool(row[field]) or field in {'decisionReason', 'status'}), f'{location}: invalid text {field}')
    require(row['schema'] == 'data-snapshot/v1', f'{location}: unsupported snapshot schema')
    require(re.fullmatch(r'[0-9a-f]{64}', row['parentSourceSha256']) is not None, f'{location}: invalid declared parent hash')
    require(row['timeframe'] in {'1', '3', '5', '15'} and row['windowBasis'] == 'BAR_OPEN_TIME', f'{location}: unsupported timeframe/window basis')
    require(0 < row['firstLoadedBarTime'] <= row['time'] < row['timeClose'] <= 4102444800000, f'{location}: invalid timestamps/history boundary')
    require(row['timeClose'] - row['time'] == int(row['timeframe']) * 60000, f'{location}: time/timeClose disagree with timeframe')
    require(0 <= row['barIndex'] <= row['lastBarIndex'], f'{location}: invalid bar indices')
    require(all(number(row[f]) and row[f] > 0 for f in CATEGORIES['rawOhlc']), f'{location}: missing/invalid raw OHLC')
    require(row['low'] <= min(row['open'], row['close']) <= max(row['open'], row['close']) <= row['high'], f'{location}: invalid OHLC ordering')
    require(number(row['mintick']) and row['mintick'] > 0, f'{location}: invalid mintick')
    require(type(row['candidates']) is list, f'{location}: candidates must be an array')
    ids = []
    for index, c in enumerate(row['candidates']):
        label = f'{location}: candidates[{index}]'
        require(type(c) is dict and set(c) == CANDIDATE_FIELDS, f'{label}: incomplete/unknown fields')
        require(type(c['id']) is str and c['id'] in CANDIDATE_IDS, f'{label}: invalid ID')
        ids.append(c['id'])
        for field in ('enabled', 'ready'):
            require(type(c[field]) is bool, f'{label}: invalid {field}')
        for field in ('stage', 'direction', 'quality'):
            require(type(c[field]) is int, f'{label}: invalid {field}')
        for field in ('setupBar', 'setupTime', 'confirmationTime'):
            require(c[field] is None or type(c[field]) is int, f'{label}: invalid {field}')
        for field in ('trigger', 'lower', 'upper', 'invalidation', 'plannedEntry'):
            require(c[field] is None or number(c[field]), f'{label}: invalid {field}')
        for field in ('status', 'rejection'):
            require(type(c[field]) is str, f'{label}: invalid {field}')
    require(len(ids) == len(set(ids)) and set(ids) == CANDIDATE_IDS, f'{location}: missing/duplicate candidate IDs')
    plan = row['plan']
    if plan is not None:
        require(type(plan) is dict and set(plan) == PLAN_FIELDS, f'{location}: incomplete/unknown plan fields')
        require(type(plan['timestamp']) is int and type(plan['setupTimestamp']) is int and plan['timestamp'] == row['timeClose'], f'{location}: invalid plan timestamps')
        require(type(plan['strategy']) is str and plan['strategy'] in CANDIDATE_IDS and type(plan['entryMode']) is str and plan['entryMode'] in {'Close', 'Limit', 'Breakout'}, f'{location}: invalid plan identity/mode')
        require(type(plan['direction']) is int and plan['direction'] in {-1, 1} and type(plan['quality']) is int, f'{location}: invalid plan direction/quality')
        require(all(number(plan[f]) for f in ('entry', 'sl', 'tp1', 'tp2', 'tp3')), f'{location}: invalid plan prices')
    return row


def read_capture(path):
    raw = path.read_bytes()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeError as error:
        raise IntakeError(f'{path}: not UTF-8') from error
    first = next((line for line in text.splitlines() if line.strip()), '')
    csv_mode = path.suffix.lower() == '.csv' or first == 'Date,Message'
    if csv_mode:
        reader = csv.reader(io.StringIO(text), strict=True)
        messages = []
        try:
            require(next(reader, None) == ['Date', 'Message'], f'{path}: expected Date,Message CSV header')
            for row in reader:
                require(len(row) == 2, f'{path}:{reader.line_num}: malformed CSV row')
                messages.append((reader.line_num, row[1], row[0]))
        except csv.Error as error:
            raise IntakeError(f'{path}:{reader.line_num}: malformed CSV: {error}') from error
    else:
        messages = [(i, line, None) for i, line in enumerate(text.splitlines(), 1)]
    records, locations, context, boundary = {}, {}, None, None
    for line, message, display_time in messages:
        if MARKER not in message:
            continue
        location = f'{path}:{line}'
        match = re.fullmatch(r'\s*(?:\[([^\]\r\n]+)\]:\s*)?DATA_SNAPSHOT_AUDIT\s+(.+?)\s*', message)
        require(match is not None, f'{location}: malformed snapshot marker')
        try:
            row = json.loads(match[2], parse_float=Decimal, parse_constant=invalid_constant, object_pairs_hook=pairs_no_duplicates)
        except (ValueError, TypeError) as error:
            raise IntakeError(f'{location}: invalid snapshot JSON: {error}') from error
        row = validate_record(row, location)
        this_context = {field: row[field] for field in CONTEXT}
        require(context is None or context == this_context, f'{location}: conflicting snapshot context within capture')
        require(boundary is None or boundary == row['firstLoadedBarTime'], f'{location}: conflicting first loaded history boundary within capture')
        context, boundary = this_context, row['firstLoadedBarTime']
        key = (row['time'], row['timeClose'])
        require(key not in records, f'{location}: duplicate snapshot for time/timeClose {key}')
        records[key] = row
        locations[key] = {'line': line, 'displayLogTime': display_time or match[1]}
    require(bool(records), f'{path}: no DATA_SNAPSHOT_AUDIT records')
    return {'path': str(path), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'format': 'CSV' if csv_mode else 'LOG_TEXT', 'snapshotCount': len(records), 'context': context, 'records': records, 'locations': locations}


def differences(before, after, path):
    if number(before) and number(after):
        return [] if before == after else [{'field': path, 'before': before, 'after': after, 'absoluteDelta': abs(Decimal(before) - Decimal(after))}]
    if type(before) is not type(after):
        return [{'field': path, 'before': before, 'after': after}]
    if isinstance(before, dict):
        result = []
        for key in sorted(set(before) | set(after)):
            if key not in before or key not in after:
                result.append({'field': f'{path}.{key}', 'beforePresent': key in before, 'afterPresent': key in after})
            else:
                result.extend(differences(before[key], after[key], f'{path}.{key}'))
        return result
    if isinstance(before, list):
        if len(before) != len(after):
            return [{'field': path, 'before': before, 'after': after}]
        return [diff for index, (a, b) in enumerate(zip(before, after)) for diff in differences(a, b, f'{path}[{index}]')]
    return [] if before == after else [{'field': path, 'before': before, 'after': after}]


def compare(before, after):
    require(before['context'] == after['context'], 'Conflicting snapshot context between captures; split runs before comparison')
    a, b = before['records'], after['records']
    common = sorted(set(a) & set(b))
    only_a, only_b = sorted(set(a) - set(b)), sorted(set(b) - set(a))
    changed = {category: [] for category in CATEGORIES}
    exact_common = data_common = 0
    for key in common:
        changed_categories = []
        for category, fields in CATEGORIES.items():
            delta = [diff for field in fields for diff in differences(a[key][field], b[key][field], field)]
            if delta:
                changed[category].append({'time': key[0], 'timeClose': key[1], 'differences': delta})
                changed_categories.append(category)
        exact_common += not changed_categories
        data_common += not any(category != 'metadata' for category in changed_categories)
    no_missing = not only_a and not only_b
    data_equal = no_missing and data_common == len(common)
    all_equal = no_missing and exact_common == len(common)
    status = 'EXACT_SNAPSHOT_MATCH' if all_equal else 'DATA_AND_STATE_MATCH_METADATA_DIFFERS' if data_equal else 'CHANGED_OR_MISSING_SNAPSHOTS'
    def target(capture):
        found = [key for key in capture['records'] if key[0] == TARGET_OPEN]
        if not found:
            return {'present': False}
        key = found[0]
        row = capture['records'][key]
        return {'present': True, 'time': row['time'], 'timeClose': row['timeClose'], 'rawOhlc': {f: row[f] for f in CATEGORIES['rawOhlc']}, 'plan': row['plan'], 'closeModeEntryEqualsRawClose': row['plan']['entry'] == row['close'] if row['plan'] and row['plan']['entryMode'] == 'Close' else None, 'firstLoadedBarTime': row['firstLoadedBarTime'], 'barIndex': row['barIndex'], 'lastBarIndex': row['lastBarIndex'], 'sourceLocation': capture['locations'][key]}
    return {
        'schema': 'data-snapshot-comparison/v1', 'status': status,
        'scope': 'Only captured rows/fields; missing snapshots are not synthesized. Declared parent hash does not authenticate probe source, settings or TradingView provenance.',
        'numericComparison': 'Exact numeric values; JSON decimal fractions are parsed as Decimal and rendered as strings in detail fields to preserve precision.',
        'inputs': {name: {k: capture[k] for k in ('path', 'sha256', 'bytes', 'format', 'snapshotCount')} for name, capture in [('before', before), ('after', after)]},
        'context': before['context'],
        'counts': {'commonSnapshots': len(common), 'exactCommonSnapshots': exact_common, 'dataAndStateMatchingCommonSnapshots': data_common, 'beforeOnlySnapshots': len(only_a), 'afterOnlySnapshots': len(only_b)},
        'dataAndStateEqual': data_equal, 'allComparedValuesEqual': all_equal,
        'missingSnapshots': {'beforeOnly': [{'time': k[0], 'timeClose': k[1]} for k in only_a], 'afterOnly': [{'time': k[0], 'timeClose': k[1]} for k in only_b]},
        'differenceCounts': {category: {'snapshots': len(rows), 'fields': sum(len(r['differences']) for r in rows)} for category, rows in changed.items()},
        'differences': changed,
        'lastBarIndexMetadata': {name: [{'time': key[0], 'timeClose': key[1], 'lastBarIndex': capture['records'][key]['lastBarIndex']} for key in sorted(capture['records'])] for name, capture in [('before', before), ('after', after)]},
        'targetBar': {'requestedBarOpen': TARGET_OPEN, 'expectedM5DecisionClose': TARGET_OPEN + 300000, 'before': target(before), 'after': target(after)},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        if args.output:
            require(args.output.resolve() not in {args.before.resolve(), args.after.resolve()}, 'Output must not overwrite a raw input')
        result = compare(read_capture(args.before), read_capture(args.after))
        output = json.dumps(result, indent=2, ensure_ascii=False, default=lambda value: str(value) if isinstance(value, Decimal) else value) + '\n'
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output)
        else:
            print(output, end='')
        return 0 if result['dataAndStateEqual'] else 1
    except (IntakeError, OSError) as error:
        print(f'Invalid snapshot evidence: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
