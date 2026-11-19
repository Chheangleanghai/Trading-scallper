"""Build isolated M5 B/CRT reference-freshness candidates from pinned parents."""

from hashlib import sha256
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PARENTS = {
    "indicator": (
        "pine/experiments/indicator_professional.pine",
        "050518694b7d83a112dc22e40e1072621f7884cc89b526b29995532131f0ad1b",
    ),
    "strategy": (
        "pine/experiments/strategy_professional.pine",
        "eb601426b7a71779cd0aee0f56f987a6cf723cf48b23131aa29d9214913f4851",
    ),
}


def replace_once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise ValueError(f"expected exactly one anchor: {old[:70]}")
    return source.replace(old, new, 1)


def generate(kind: str) -> str:
    path, expected_hash = PARENTS[kind]
    raw = (ROOT / path).read_bytes()
    if sha256(raw).hexdigest() != expected_hash:
        raise ValueError(f"{path}: parent hash changed; review before regeneration")
    source = raw.decode("utf-8")
    source = replace_once(
        source,
        'A-H Plan candidate"',
        'A-H CRT freshness research"',
    )
    source = replace_once(
        source,
        "type ModuleMemory\n    int crtUsed = na\n",
        "type ModuleMemory\n    int crtUsed = na\n    int crtCandidateReference = na\n",
    )
    source = replace_once(
        source,
        "updateCandidates() =>\n",
        "// Research hypothesis: B's sweep reference should remain the same completed CRT candle.\n"
        "crtReferenceFresh(int setupReferenceTime, int currentReferenceTime) =>\n"
        "    not na(setupReferenceTime) and not na(currentReferenceTime) and setupReferenceTime == currentReferenceTime\n"
        "updateCandidates() =>\n",
    )
    source = replace_once(
        source,
        "    for c in candidates\n"
        "        c.maintain(bar_index, low, high, expiry)\n\n"
        "    // A exposes the existing sweep/MSS/FVG state without changing its sequence.\n",
        "    for c in candidates\n"
        "        c.maintain(bar_index, low, high, expiry)\n"
        "    // Restrict this experiment to the FOREXCOM M5 / 15-minute CRT configuration.\n"
        "    // The guard reads only the already-completed higher-timeframe reference.\n"
        "    if syminfo.tickerid == 'FOREXCOM:XAUUSD' and timeframe.period == '5' and timeframe.in_seconds(crtTF) == 900 and candB.stage > 0 and not crtReferenceFresh(memory.crtCandidateReference, crtTime)\n"
        "        if auditLog and useResearchWindow and researchBarAllowed(true, researchStart, researchEnd, time, time_close)\n"
        "            string currentReference = na(crtTime) ? 'null' : str.tostring(crtTime)\n"
        "            log.info('CRT_FRESHNESS_AUDIT {\"symbol\":\"FOREXCOM:XAUUSD\",\"timeframe\":\"5\",\"module\":\"B_CRT\",\"setupTimestamp\":' + str.tostring(candB.setupTime) + ',\"expiredAt\":' + str.tostring(time_close) + ',\"direction\":' + str.tostring(candB.direction) + ',\"setupReferenceOpen\":' + str.tostring(memory.crtCandidateReference) + ',\"currentReferenceOpen\":' + currentReference + '}')\n"
        "        candB.stage := 0\n"
        "        candB.ready := false\n"
        "        candB.status := 'EXPIRED'\n\n"
        "    // A exposes the existing sweep/MSS/FVG state without changing its sequence.\n",
    )
    source = replace_once(
        source,
        "                memory.crtUsed := crtTime\n",
        "                memory.crtUsed := crtTime\n"
        "                memory.crtCandidateReference := crtTime\n",
    )
    return source


if __name__ == "__main__":
    for kind in PARENTS:
        content = generate(kind)
        output = ROOT / f"pine/experiments/{kind}_crt_freshness.pine"
        if "--check" in sys.argv:
            if not output.exists() or output.read_text() != content:
                raise SystemExit(f"{output.name}: regenerate CRT freshness candidate")
        else:
            output.write_text(content)
        print(output.name, sha256(content.encode()).hexdigest())
