"""Append an observation-only snapshot probe to the frozen confirmation Indicator."""
from pathlib import Path
from hashlib import sha256
import sys

ROOT = Path(__file__).resolve().parents[1]
PARENT = ROOT / 'pine/experiments/indicator_confirmation_review.pine'
PARENT_HASH = '0a19862b22973e13a31abb29e59a75a18f3e0b84bb76deb2154eae7fa4cd1ed3'
OUTPUT = ROOT / 'pine/experiments/indicator_data_snapshot.pine'


def generate():
    raw = PARENT.read_bytes()
    if sha256(raw).hexdigest() != PARENT_HASH:
        raise SystemExit('Unknown confirmation-review parent; refusing snapshot generation')
    source = raw.decode()
    old_title = '"XAUUSD SMART SCALPER PRO · A-H Confirmation review"'
    assert source.count(old_title) == 1
    source = source.replace(old_title, '"XAUUSD SMART SCALPER PRO · Data snapshot research"', 1)
    return source + '\n' + (ROOT / 'pine/experiments/data_snapshot.pine.inc').read_text()


if __name__ == '__main__':
    content = generate()
    if '--check' in sys.argv:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit('Regenerate the isolated data-snapshot Indicator')
    else:
        OUTPUT.write_text(content)
    print(OUTPUT.name, sha256(content.encode()).hexdigest())
