#!/usr/bin/env python3
"""Compare observation-only Pine DATA_SNAPSHOT_AUDIT exports without filling gaps.

Exit codes: 0=verified comparison, 1=changed or incomplete evidence,
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
EXECUTION_MARKER = 'SNAPSHOT_EXECUTION_AUDIT'
TARGET_OPEN = 1793785800000
CONTEXT = ('schema', 'parentSourceSha256', 'scriptVersion', 'symbol', 'timeframe', 'windowBasis')
EXECUTION_IDENTITY = ('parentSourceSha256', 'symbol', 'timeframe')
EXECUTION_BOOLS = {'realtime', 'history', 'confirmed', 'openingUpdateObserved'}
EXECUTION_INTS = {'time', 'timeClose', 'windowStart', 'windowEnd', 'bootAt', 'observedAt', 'updates'}
EXECUTION_FIELDS = {*EXECUTION_IDENTITY, 'schema', 'captureId', 'firstPlanUpdate'} | EXECUTION_BOOLS | EXECUTION_INTS
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
TIME_EXIT_CONFIG_FIELDS = {'mode', 'entryMode', 'maximumHoldingMinutes', 'moduleDConcept', 'msnrMaximumLevelAge'}
TIME_EXIT_FIELDS = {'timeExitConfig', 'timeExitQueued'}


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


def validate_time_exit(row, location):
    config = row['timeExitConfig']
    require(type(config) is dict and set(config) == TIME_EXIT_CONFIG_FIELDS, f'{location}: invalid time-exit configuration fields')
    mode, entry_mode = config['mode'], config['entryMode']
    require(mode in ('NEXT_BAR_OPEN', 'CONFIRMATION_CLOSE') and entry_mode in ('Close', 'Limit', 'Breakout'),
            f'{location}: invalid time-exit mode or entry mode')
    require(mode != 'NEXT_BAR_OPEN' or entry_mode == 'Close', f'{location}: next-open timing requires Close entry')
    hold = config['maximumHoldingMinutes']
    require(type(hold) is int and hold >= 0, f'{location}: invalid maximum holding time')
    concept, age = config['moduleDConcept'], config['msnrMaximumLevelAge']
    require(concept in ('K-SNR', 'MSNR body flip'), f'{location}: invalid Module D concept')
    require((age is None if concept == 'K-SNR' else type(age) is int and 2 <= age <= 500),
            f'{location}: invalid MSNR level age')
    require(type(row['timeExitQueued']) is bool, f'{location}: invalid queued time-exit state')
    require(not row['timeExitQueued'] or mode == 'NEXT_BAR_OPEN' and hold > 0 and row['active'] and not row['pending'],
            f'{location}: queued time exit requires an active next-open plan with a holding limit')
    require(row['plan'] is None or row['plan']['entryMode'] == entry_mode, f'{location}: plan entry mode differs from time-exit configuration')


def validate_record(row, location):
    require(type(row) is dict, f'{location}: snapshot must be an object')
    schema = row.get('schema')
    require(schema in ('data-snapshot/v1', 'data-snapshot/v2'), f'{location}: unsupported snapshot schema')
    required = REQUIRED | TIME_EXIT_FIELDS if schema == 'data-snapshot/v2' else REQUIRED
    require(set(row) == required, f'{location}: missing fields {sorted(required - set(row))}; unexpected fields {sorted(set(row) - required)}')
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
    if schema == 'data-snapshot/v2':
        validate_time_exit(row, location)
    return row


def validate_execution(row, location):
    require(type(row) is dict and set(row) == EXECUTION_FIELDS, f'{location}: invalid execution fields')
    require(row['schema'] == 'snapshot-execution/v2', f'{location}: unsupported execution schema')
    require(all(type(row[field]) is bool for field in EXECUTION_BOOLS), f'{location}: invalid execution flags')
    require(all(type(row[field]) is int for field in EXECUTION_INTS), f'{location}: invalid execution integer')
    require(row['confirmed'] and row['realtime'] != row['history'], f'{location}: expected a confirmed realtime or historical bar')
    require(not row['openingUpdateObserved'] or row['realtime'] and row['updates'] >= 2, f'{location}: invalid opening observation')
    require(0 < row['bootAt'] <= row['observedAt'], f'{location}: invalid execution clock')
    require(row['windowStart'] <= row['time'] < row['windowEnd'] and row['timeClose'] > row['time'], f'{location}: execution outside capture window')
    require(row['updates'] > 0 and (row['realtime'] or row['updates'] == 1), f'{location}: invalid update count')
    first_update = row['firstPlanUpdate']
    require(first_update is None or type(first_update) is int and 1 <= first_update <= row['updates'], f'{location}: invalid first plan update')
    require(type(row['captureId']) is str, f'{location}: invalid capture ID')
    prefix, _, boot = row['captureId'].rpartition(':')
    require(bool(prefix.strip()) and boot == str(row['bootAt']), f'{location}: invalid capture ID or boot clock')
    return row


def read_capture(path, with_execution=False):
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
    records, locations, execution, execution_context = {}, {}, {}, None
    context, boundary = None, None
    duplicate_snapshots = duplicate_executions = 0
    for line, message, display_time in messages:
        marker = EXECUTION_MARKER if with_execution and EXECUTION_MARKER in message else MARKER
        if marker not in message:
            continue
        location = f'{path}:{line}'
        match = re.fullmatch(rf'\s*(?:\[([^\]\r\n]+)\]:\s*)?{marker}\s+(.+?)\s*', message)
        require(match is not None, f'{location}: malformed snapshot marker')
        try:
            row = json.loads(match[2], parse_float=Decimal, parse_constant=invalid_constant, object_pairs_hook=pairs_no_duplicates)
        except (ValueError, TypeError) as error:
            raise IntakeError(f'{location}: invalid snapshot JSON: {error}') from error
        if marker == EXECUTION_MARKER:
            row = validate_execution(row, location)
            metadata = {field: row[field] for field in ('captureId', 'bootAt', 'windowStart', 'windowEnd', *EXECUTION_IDENTITY)}
            require(execution_context is None or execution_context == metadata, f'{location}: mixed execution runs or windows')
            execution_context = metadata
            key = (row['time'], row['timeClose'])
            if key in execution:
                require(execution[key] == row, f'{location}: conflicting duplicate execution for {key}')
                duplicate_executions += 1
            execution[key] = row
            continue
        row = validate_record(row, location)
        this_context = {field: row[field] for field in CONTEXT}
        if row['schema'] == 'data-snapshot/v2':
            this_context['timeExitConfig'] = row['timeExitConfig']
        require(context is None or context == this_context, f'{location}: conflicting snapshot context within capture')
        require(boundary is None or boundary == row['firstLoadedBarTime'], f'{location}: conflicting first loaded history boundary within capture')
        context, boundary = this_context, row['firstLoadedBarTime']
        key = (row['time'], row['timeClose'])
        if key in records:
            require(with_execution and records[key] == row, f'{location}: duplicate snapshot for time/timeClose {key}')
            duplicate_snapshots += 1
            continue
        records[key] = row
        locations[key] = {'line': line, 'displayLogTime': display_time or match[1]}
    require(bool(records), f'{path}: no DATA_SNAPSHOT_AUDIT records')
    result = {'path': str(path), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'format': 'CSV' if csv_mode else 'LOG_TEXT', 'snapshotCount': len(records), 'context': context, 'records': records, 'locations': locations}
    if with_execution:
        require(records.keys() == execution.keys(), f'{path}: missing snapshot or execution record for a candle')
        require(all(context[field] == execution_context[field] for field in EXECUTION_IDENTITY), f'{path}: snapshot/execution identity mismatch')
        for key, row in records.items():
            observed = execution[key]
            first = observed['firstPlanUpdate']
            if row['plan'] is not None:
                require(first is not None, f'{path}: confirmed plan missing its first observation for {key}')
            elif first is not None:
                require(first < observed['updates'], f'{path}: execution reports a closing plan absent from snapshot for {key}')
        result.update(execution=execution, executionContext=execution_context,
                      identicalDuplicates={'snapshots': duplicate_snapshots, 'executions': duplicate_executions})
    return result


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
    categories = CATEGORIES
    if before['context']['schema'] == 'data-snapshot/v2':
        categories = {**CATEGORIES, 'executionState': (*CATEGORIES['executionState'], 'timeExitQueued')}
    a, b = before['records'], after['records']
    common = sorted(set(a) & set(b))
    only_a, only_b = sorted(set(a) - set(b)), sorted(set(b) - set(a))
    changed = {category: [] for category in categories}
    exact_common = data_common = 0
    for key in common:
        changed_categories = []
        for category, fields in categories.items():
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


def compare_execution(before, after, phase):
    a, b = before['executionContext'], after['executionContext']
    require(a['captureId'] != b['captureId'], 'Execution captures must have distinct effective run IDs')
    require(all(a[field] == b[field] for field in ('windowStart', 'windowEnd', *EXECUTION_IDENTITY)),
            'Execution comparison requires the same capture window, parent, and chart')

    before_executions = before['execution']
    if phase == 'historical':
        require(all(row['history'] for capture in (before, after) for row in capture['execution'].values()),
                'Historical comparison requires historical snapshots in both captures')
    else:
        before_executions = {key: row for key, row in before_executions.items() if row['realtime']}

    keys = set(before_executions)
    qualified = [key for key in sorted(keys) if before['records'][key]['plan'] is not None]
    early = [key[1] for key, row in sorted(before_executions.items())
             if row['firstPlanUpdate'] is not None and row['firstPlanUpdate'] < row['updates']]
    missing_openings = [key[1] for key in qualified if phase == 'live' and not before_executions[key]['openingUpdateObserved']]
    nonhistorical_reloads = [key[1] for key in sorted(keys & after['execution'].keys()) if not after['execution'][key]['history']]

    if phase == 'live':
        # The reload can contain newer bars; preserve original capture hashes and compare the observed realtime candles.
        before = {**before, 'records': {key: before['records'][key] for key in keys}}
        after = {**after, 'records': {key: after['records'][key] for key in keys & after['records'].keys()}}
    result = compare(before, after)
    verified = bool(qualified) and result['dataAndStateEqual'] and not (early or missing_openings or nonhistorical_reloads)
    result['snapshotStatus'] = result['status']
    result['status'] = f'{phase.upper()}_QUALIFIED_PLANS_MATCH' if verified else f'{phase.upper()}_EVIDENCE_UNVERIFIED'
    result['executionEvidence'] = {
        'phase': phase,
        'verified': verified,
        'captures': {'before': a, 'after': b},
        'identicalDuplicates': {name: capture['identicalDuplicates'] for name, capture in [('before', before), ('after', after)]},
        'comparedBeforeCandles': len(keys),
        'qualifiedPlanCloses': [key[1] for key in qualified],
        'plansObservedBeforeClose': early,
        'qualifiedClosesMissingOpeningUpdate': missing_openings,
        'reloadClosesStillRealtime': nonhistorical_reloads,
    }
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--execution', choices=['historical', 'live'], help='require v2 execution records and matched qualified plans')
    args = parser.parse_args()
    try:
        if args.output:
            require(args.output.resolve() not in {args.before.resolve(), args.after.resolve()}, 'Output must not overwrite a raw input')
        before = read_capture(args.before, with_execution=bool(args.execution))
        after = read_capture(args.after, with_execution=bool(args.execution))
        result = compare_execution(before, after, args.execution) if args.execution else compare(before, after)
        output = json.dumps(result, indent=2, ensure_ascii=False, default=lambda value: str(value) if isinstance(value, Decimal) else value) + '\n'
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output)
        else:
            print(output, end='')
        verified = result['executionEvidence']['verified'] if args.execution else result['dataAndStateEqual']
        return 0 if verified else 1
    except (IntakeError, OSError) as error:
        print(f'Invalid snapshot evidence: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
