"""Build a fixed-window observation-only probe for live versus reload capture."""
import argparse
from pathlib import Path
from hashlib import sha256

ROOT = Path(__file__).resolve().parents[1]
PARENT = ROOT / 'pine/experiments/indicator_confirmation_review.pine'
PARENT_SHA = '0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3'
OUTPUT = ROOT / 'pine/experiments/indicator_live_snapshot.pine'
START = "timestamp('06 Nov 2026 00:55 +0000')"
END = "timestamp('06 Nov 2026 01:05 +0000')"
DIAGNOSTIC_PARENT = ROOT / 'pine/experiments/indicator_signal_diagnostics.pine'
DIAGNOSTIC_SHA = '932932c8a59c0017b2c0dfdef1194f893ec0aa59823149a0868d48d69a426da5'
DIAGNOSTIC_OUTPUT = ROOT / 'pine/experiments/indicator_signal_live_probe.pine'
TIME_EXIT_PARENT = ROOT / 'pine/experiments/indicator_time_exit_timing.pine'
TIME_EXIT_SHA = '7356a5ff27de9db7fd56e638ff0917502e8cdae163e8997cba62c5a30d3f3b08'
TIME_EXIT_OUTPUT = ROOT / 'pine/experiments/indicator_time_exit_live_probe.pine'


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


def generate_diagnostic_probe(timing=False):
    path = TIME_EXIT_PARENT if timing else DIAGNOSTIC_PARENT
    parent_sha = TIME_EXIT_SHA if timing else DIAGNOSTIC_SHA
    raw = path.read_bytes()
    if sha256(raw).hexdigest() != parent_sha:
        raise SystemExit(f'{path.name} differs from the frozen Indicator source')
    parent = raw.decode()
    title = '· Time exit timing research"' if timing else '· A-H Research diagnostics"'
    probe_title = '· Time exit live research"' if timing else '· Live signal research"'
    assert parent.count(title) == 1
    source = parent.replace(title, probe_title, 1)
    probe = (ROOT / 'pine/experiments/signal_live_probe.pine.inc').read_text().replace('DIAGNOSTIC_SOURCE_SHA', parent_sha)
    helper = (ROOT / 'pine/experiments/data_snapshot.pine.inc').read_text()
    old_window = "time >= timestamp('04 Nov 2026 09:30 +0000') and time <= timestamp('04 Nov 2026 10:20 +0000')"
    marker = "    log.info('DATA_SNAPSHOT_AUDIT ' + dataSnapshotPayload)"
    assert helper.count(old_window) == helper.count(PARENT_SHA) == helper.count(marker) == 1
    helper = helper.replace(old_window, 'liveProbeInside').replace(PARENT_SHA, parent_sha)
    if timing:
        helper = helper.replace('data-snapshot/v1', 'data-snapshot/v2')
        helper = helper.replace(marker, '''    string timeExitConfig = '{"mode":' + diagQ(timeExitAtNextOpen ? 'NEXT_BAR_OPEN' : 'CONFIRMATION_CLOSE') + ',"entryMode":' + diagQ(entryMode) + ',"maximumHoldingMinutes":' + diagInt(timeExit) + ',"moduleDConcept":' + diagQ(snrMode) + ',"msnrMaximumLevelAge":' + diagInt(snrMode == 'MSNR body flip' ? msnrMaxLevelBars : na) + '}'
    dataSnapshotPayload := str.substring(dataSnapshotPayload, 0, str.length(dataSnapshotPayload) - 1) + ',"timeExitConfig":' + timeExitConfig + ',"timeExitQueued":' + diagBool(timeExitQueued) + '}'
''' + marker)
    return source + '\n' + probe + '\n' + helper.replace(marker, marker + '\n    log.info(\'SNAPSHOT_EXECUTION_AUDIT \' + liveProbeExecution())')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    variants = parser.add_mutually_exclusive_group()
    variants.add_argument('--diagnostics', action='store_true')
    variants.add_argument('--time-exit', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.time_exit:
        output, content = TIME_EXIT_OUTPUT, generate_diagnostic_probe(timing=True)
    elif args.diagnostics:
        output, content = DIAGNOSTIC_OUTPUT, generate_diagnostic_probe()
    else:
        output, content = OUTPUT, generate()
    if args.check:
        if not output.exists() or output.read_text() != content:
            raise SystemExit('Regenerate the isolated live snapshot probe')
    else:
        output.write_text(content)
    print(output.name, sha256(content.encode()).hexdigest())
