"""Generate an opt-in Indicator experiment for next-open time exits."""
from hashlib import sha256
from pathlib import Path
import sys


PINE = Path(__file__).resolve().parents[1] / 'pine/experiments'
PARENT = PINE / 'indicator_signal_diagnostics.pine'
PARENT_SHA = '932932c8a59c0017b2c0dfdef1194f893ec0aa59823149a0868d48d69a426da5'
OUTPUT = PINE / 'indicator_time_exit_timing.pine'


def generate():
    raw = PARENT.read_bytes()
    if sha256(raw).hexdigest() != PARENT_SHA:
        raise SystemExit('Time-exit experiment requires the native-tested diagnostic parent')
    source = raw.decode()

    def replace(anchor, replacement):
        nonlocal source
        if source.count(anchor) != 1:
            raise SystemExit(f'Time-exit experiment anchor must occur once: {anchor}')
        source = source.replace(anchor, replacement, 1)

    replace('· A-H Research diagnostics"', '· Time exit timing research"')
    hold_input = "timeExit = input.int(15, 'Maximum holding minutes (0 disables)', minval=0)"
    replace(hold_input, hold_input + f"""
estimateTimeExitNextOpen = input.bool(false, 'Estimate time exit at next bar open (Close entry)', group='Time exit research')
bool timeExitAtNextOpen = estimateTimeExitNextOpen and entryMode == 'Close'
const string TIME_EXIT_PARENT_SHA = '{PARENT_SHA}'""")
    replace('var int fillTime = na\n', 'var int fillTime = na\nvar bool timeExitQueued = false\n')
    replace('reviewCloseCode(bool', '''estimateExit(bool nextOpen, bool queued, bool due, bool stopTouched, bool finalTargetTouched) =>
    bool stopHit = not queued and stopTouched
    bool finalTargetHit = not queued and finalTargetTouched
    bool timeHit = queued or (due and not nextOpen)
    bool queueExit = nextOpen and due and not (queued or stopHit or finalTargetHit)
    [stopHit, finalTargetHit, timeHit, queueExit]
reviewCloseCode(bool''')
    replace('''        bool stopped = dir == 1 ? low <= managedStop : high >= managedStop
        bool third = dir == 1 ? high >= tp3 : low <= tp3
        bool timed = timeExit > 0 and time_close - fillTime >= timeExit * 60000''', '''        bool stopTouched = dir == 1 ? low <= managedStop : high >= managedStop
        bool finalTargetTouched = dir == 1 ? high >= tp3 : low <= tp3
        bool timeDue = timeExit > 0 and time_close - fillTime >= timeExit * 60000
        [stopped, third, timed, queueExit] = estimateExit(timeExitAtNextOpen, timeExitQueued, timeDue, stopTouched, finalTargetTouched)''')
    replace('''            else
                if not hit1 and (dir == 1 ? high >= tp1 : low <= tp1)''', '''            else if not timeExitQueued
                if not hit1 and (dir == 1 ? high >= tp1 : low <= tp1)''')
    replace('                reviewOutcome.closeTime := time_close\n', '''                // Observe the scheduled open at this confirmed close, before admitting another plan.
                reviewOutcome.closeTime := timeExitQueued ? time : time_close
                timeExitQueued := false
''')
    replace('''        if active
            float originalRisk''', '''            else if queueExit
                timeExitQueued := true
        if active and not timeExitQueued
            float originalRisk''')
    capture_end = "str.tostring(msnrMaxLevelBars) : ''))"
    replace(capture_end, """str.tostring(msnrMaxLevelBars) : '') + ',"indicatorTimeExitTiming":' + diagQ(timeExitAtNextOpen ? 'NEXT_BAR_OPEN' : 'CONFIRMATION_CLOSE') + ',"timingResearchParentSha256":' + diagQ(TIME_EXIT_PARENT_SHA))""")
    return source


if __name__ == '__main__':
    content = generate()
    if '--check' in sys.argv:
        if not OUTPUT.is_file() or OUTPUT.read_text() != content:
            raise SystemExit('Regenerate the Indicator time-exit experiment')
    else:
        OUTPUT.write_text(content)
    print(OUTPUT.name, sha256(content.encode()).hexdigest())
