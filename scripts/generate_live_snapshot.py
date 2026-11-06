"""Build a fixed-window observation-only probe for live versus reload capture."""
from pathlib import Path
from hashlib import sha256
import sys

ROOT = Path(__file__).resolve().parents[1]
PARENT = ROOT / 'pine/experiments/indicator_confirmation_review.pine'
PARENT_SHA = '0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3'
OUTPUT = ROOT / 'pine/experiments/indicator_live_snapshot.pine'
START = "timestamp('06 Nov 2026 00:55 +0000')"
END = "timestamp('06 Nov 2026 01:05 +0000')"


def generate():
    raw = PARENT.read_bytes()
    if sha256(raw).hexdigest() != PARENT_SHA:
        raise SystemExit('Unknown parent; refusing live snapshot generation')
    parent = raw.decode()
    title = '"XAUUSD SMART SCALPER PRO · A-H Confirmation review"'
    assert parent.count(title) == 1
    source = parent.replace(title, '"XAUUSD SMART SCALPER PRO · Live snapshot research"', 1)
    helper = (ROOT / 'pine/experiments/data_snapshot.pine.inc').read_text()
    old_window = "time >= timestamp('04 Nov 2026 09:30 +0000') and time <= timestamp('04 Nov 2026 10:20 +0000')"
    assert helper.count(old_window) == 1
    helper = helper.replace(old_window, f'time >= {START} and time <= {END}')
    marker = "    log.info('DATA_SNAPSHOT_AUDIT ' + dataSnapshotPayload)"
    assert helper.count(marker) == 1
    phase = '''
    // Observation metadata differs legitimately between realtime and history.
    log.info('SNAPSHOT_EXECUTION_AUDIT ' + '{"schema":"snapshot-execution/v1","parentSourceSha256":"PARENT_SHA","symbol":"' + jsonEscape(syminfo.tickerid) + '","timeframe":"' + timeframe.period + '","time":' + str.tostring(time) + ',"timeClose":' + str.tostring(time_close) + ',"observedAt":' + str.tostring(timenow) + ',"realtime":' + dataSnapshotBool(barstate.isrealtime) + ',"history":' + dataSnapshotBool(barstate.ishistory) + ',"confirmed":' + dataSnapshotBool(barstate.isconfirmed) + '}')'''.replace('PARENT_SHA', PARENT_SHA)
    helper = helper.replace(marker, marker + phase)
    return source + '\n' + helper


if __name__ == '__main__':
    content = generate()
    if '--check' in sys.argv:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit('Regenerate the isolated live snapshot probe')
    else:
        OUTPUT.write_text(content)
    print(OUTPUT.name, sha256(content.encode()).hexdigest())
