"""Remove viewport-triggered restarts in isolated presentation-only candidates."""
from pathlib import Path
from hashlib import sha256
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPERIMENTS = ROOT / 'pine/experiments'
PARENTS = {
    'indicator': '0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3',
    'strategy': 'bbabd036eea548177eaaa85c45d33da07ce2b1289748dc6b041327f48969609a',
}
OLD = '''// Visible-range data controls label spacing only. It never feeds a trading predicate.
var float clearVisibleHigh = na
var float clearVisibleLow = na
if time >= chart.left_visible_bar_time and time <= chart.right_visible_bar_time
    clearVisibleHigh := na(clearVisibleHigh) ? high : math.max(clearVisibleHigh, high)
    clearVisibleLow := na(clearVisibleLow) ? low : math.min(clearVisibleLow, low)'''
NEW = '''// Presentation-only rolling range for label spacing; no viewport-triggered reloads.
float clearVisibleHigh = ta.highest(high, 100)
float clearVisibleLow = ta.lowest(low, 100)'''


def generate(kind):
    raw = (EXPERIMENTS / f'{kind}_confirmation_review.pine').read_bytes()
    if sha256(raw).hexdigest() != PARENTS[kind]:
        raise SystemExit(f'Unknown frozen {kind} parent')
    source = raw.decode()
    old_title = 'A-H Confirmation review"'
    assert source.count(old_title) == 1 and source.count(OLD) == 1
    return source.replace(old_title, 'A-H Stable display review"', 1).replace(OLD, NEW, 1)


def generate_probe(stable):
    parent_sha = sha256(stable.encode()).hexdigest()
    helper = (EXPERIMENTS / 'data_snapshot.pine.inc').read_text()
    helper = helper.replace(PARENTS['indicator'], parent_sha)
    old_window = "time >= timestamp('04 Nov 2026 09:30 +0000') and time <= timestamp('04 Nov 2026 10:20 +0000')"
    window = "time >= timestamp('06 Nov 2026 05:00 +0000') and time <= timestamp('06 Nov 2026 05:10 +0000')"
    assert helper.count(old_window) == 1
    helper = helper.replace(old_window, window)
    helper = helper.replace('var int dataSnapshotFirstLoadedTime = na', '''varip int stableProbeBootAt = timenow
varip int stableProbeUpdates = 0
varip bool stableProbeSeenRealtime = false
stableProbeUpdates += 1
var int dataSnapshotFirstLoadedTime = na''')
    marker = "    log.info('DATA_SNAPSHOT_AUDIT ' + dataSnapshotPayload)"
    phase = '''
    log.info('SNAPSHOT_EXECUTION_AUDIT ' + '{"schema":"snapshot-execution/v1","parentSourceSha256":"PARENT_SHA","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","time":' + str.tostring(time) + ',"timeClose":' + str.tostring(time_close) + ',"observedAt":' + str.tostring(timenow) + ',"realtime":' + dataSnapshotBool(barstate.isrealtime) + ',"history":' + dataSnapshotBool(barstate.ishistory) + ',"confirmed":' + dataSnapshotBool(barstate.isconfirmed) + ',"bootAt":' + str.tostring(stableProbeBootAt) + ',"updates":' + str.tostring(stableProbeUpdates) + '}')'''.replace('PARENT_SHA', parent_sha)
    assert helper.count(marker) == 1
    helper = helper.replace(marker, marker + phase)
    heartbeat = '''
// Realtime-only startup/new-bar/closing heartbeat. These variables never feed trading state.
if barstate.isrealtime and (not stableProbeSeenRealtime or barstate.isnew or barstate.isconfirmed)
    log.info('RUNTIME_STATE_AUDIT ' + '{"schema":"stable-runtime/v1","time":' + str.tostring(time) + ',"timeClose":' + str.tostring(time_close) + ',"observedAt":' + str.tostring(timenow) + ',"bootAt":' + str.tostring(stableProbeBootAt) + ',"updates":' + str.tostring(stableProbeUpdates) + ',"realtime":true,"history":false,"confirmed":' + dataSnapshotBool(barstate.isconfirmed) + ',"isNew":' + dataSnapshotBool(barstate.isnew) + '}')
    stableProbeSeenRealtime := true
'''
    return stable.replace('A-H Stable display review"', 'A-H Stable live snapshot"', 1) + '\n' + helper + heartbeat


if __name__ == '__main__':
    outputs = {f'{kind}_stable_display.pine': generate(kind) for kind in PARENTS}
    outputs['indicator_stable_live_snapshot.pine'] = generate_probe(outputs['indicator_stable_display.pine'])
    for filename, source in outputs.items():
        path = EXPERIMENTS / filename
        if '--check' in sys.argv:
            if not path.exists() or path.read_text() != source:
                raise SystemExit(f'Regenerate {filename}')
        else:
            path.write_text(source)
        print(filename, sha256(source.encode()).hexdigest())
