"""Read observed isolated-run AX controls; no defaults or raw edits."""
import datetime
import hashlib
import json
import re
from pathlib import Path

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
SOURCE = ROOT / "pine/experiments/strategy_stable_display.pine"
BASE = ROOT / "reports/native-v080/live-reload-2026-11-06/strategy-stable-runtime-inputs.json"
ZONE = datetime.timezone(datetime.timedelta(hours=7))
SPECS = []
for line in SOURCE.read_text().splitlines():
    match = re.match(r"(\w+) = input\.(\w+)\((?:'[^']*'|[^,]*), '([^']+)'", line)
    if match:
        SPECS.append(match.groups())
assert len(SPECS) == 117


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def controls(files):
    lines = []
    for name in files:
        text = re.sub(r"^[+~]", "", (D / name).read_text(), flags=re.M)
        match = re.search(r"\d+ container \(showing", text)
        assert match, name
        part = text[match.start():]
        part = part[:part.index("pop up button Defaults")]
        lines.extend((name, s) for s in part.splitlines())
    values, observed, missing = {}, {}, []
    for name, typ, label in SPECS:
        found = []
        evidence = []
        for i, (filename, line) in enumerate(lines):
            if typ == "bool":
                match = re.search(r"checkbox " + re.escape(label) + r", Value: ([01])", line)
                if match:
                    found.append(bool(int(match[1])))
                    evidence.append({"file": filename, "control": line.strip()})
                continue
            if not re.search(r"\d+ text ", line) or not line.endswith(label):
                continue
            after = []
            for following_file, following in lines[i + 1:i + 8]:
                # AX "text field" is an input, not the next text label. A
                # session's two controls have a harmless dash between them.
                is_label = re.match(r"\s*\d+ text (?!field \(settable\))", following)
                is_separator = re.fullmatch(r"\s*\d+ text\s+[—–-]\s*", following)
                if following_file != filename or (is_label and not is_separator):
                    break
                if re.match(r"\s*\d+ (text field|combo box) \(settable\)", following):
                    after.append(following.strip())
            needed = 2 if typ in ("time", "session") else 1
            if len(after) < needed:
                continue
            after = after[:needed]
            plain = [re.sub(r"^\d+ (?:text field|combo box) \(settable\) (?:Value: )?", "", v).split(", Placeholder:")[0] for v in after]
            if typ in ("int", "float"):
                parsed = float(plain[0].replace(",", ""))
                parsed = int(parsed) if typ == "int" else parsed
            elif typ == "time":
                parsed = int(datetime.datetime.fromisoformat(plain[0] + "T" + plain[1] + ":00").replace(tzinfo=ZONE).timestamp() * 1000)
            elif typ == "session":
                if not all(re.fullmatch(r"\d{2}:\d{2}", v) for v in plain):
                    continue
                parsed = plain[0].replace(":", "") + "-" + plain[1].replace(":", "")
            elif typ == "timeframe":
                parsed = plain[0].split(" ")[0]
            else:
                parsed = plain[0]
            found.append(parsed)
            evidence.append({"file": filename, "controls": after, "displayed": plain})
        if not found:
            missing.append(name)
            continue
        assert len(set(found)) == 1, (name, set(found))
        values[name] = found[0]
        observed[name] = evidence
    return values, observed, missing


a_files = [f"a-inputs-page{i}.ax.txt" for i in range(14)]
a_values, a_observed, a_missing = controls(a_files)
assert not a_missing, a_missing
assert len(a_values) == 117
baseline = json.loads(BASE.read_text())["inputSettings"]
diff = [{"input": k, "stableCombined": baseline[k], "aOnly": v} for k, v in a_values.items() if baseline[k] != v]
assert {v["input"] for v in diff} == {"enable" + k for k in "BCDEFGH"}, diff
assert a_values["enableA"] and all(not a_values["enable" + k] for k in "BCDEFGH")
g_values, g_observed, g_missing = controls(["g-inputs-top.ax.txt"])
expected_g = {**a_values, "enableA": False, "enableG": True}
g_diff = [{"input": k, "expectedAfterOnlyAoffGon": expected_g[k], "observed": v} for k, v in g_values.items() if expected_g[k] != v]
assert not g_diff, g_diff
assert g_values["enableA"] is False and g_values["enableG"] is True

out = {
    "attribution": "Native A dialog controls observed across14 AX pages; G top-page controls independently observed. Missing G controls are not filled from A or defaults.",
    "source": {"path": str(SOURCE.relative_to(ROOT)), "sha256": digest(SOURCE)},
    "timezone": {"displayOffset": "+07:00", "basis": "A raw native log row prefixes show+07:00 and root independently observed chart UTC+7 in G report screenshot. Inputs display07:00 versus prior capture00:00; normalize as+07, not UTC. Origin of chart display-zone change is unestablished.",
                 "timeInputEpochsUnchangedAfterNormalization": all(a_values[k] == baseline[k] for k, typ, _ in SPECS if typ == "time")},
    "aOnly": {"inputCount": len(a_values), "inputSettings": a_values, "missing": a_missing,
              "evidence": [{"path": name, "sha256": digest(D / name)} for name in a_files], "observedControls": a_observed},
    "comparisonWithPriorStableCombined": {"differenceCount": len(diff), "differences": diff,
                                          "nonModuleInputsExactlyEqual": all(a_values[k] == baseline[k] for k in a_values if not re.fullmatch("enable[A-H]", k))},
    "gOnly": {"observedInputCount": len(g_values), "observedInputSettings": g_values, "notIndependentlyRecaptured": g_missing,
              "expectedTransition": "OnlyAoff/Gon from captured A inputs, per root UI action record. This is continuity evidence, not a new117-control recapture.",
              "observedControls": g_observed,
              "evidence": {"path": "g-inputs-top.ax.txt", "sha256": digest(D / "g-inputs-top.ax.txt")},
              "mismatchesAgainstExpectedTransition": g_diff},
}
(D / "isolated-runtime-inputs.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({"aInputs": len(a_values), "aMissing": a_missing, "differenceCountFromCombined": len(diff), "differences": diff,
                  "timeInputEpochsUnchanged": out["timezone"]["timeInputEpochsUnchangedAfterNormalization"],
                  "gObservedInputs": len(g_values), "gUncapturedInputs": len(g_missing), "gUnexpectedDifferences": g_diff}, indent=2))
