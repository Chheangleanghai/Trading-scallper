#!/usr/bin/env python3
"""Package an immutable local research snapshot with a verified source inventory."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import zipfile

from package_share import create_archive, verify_archive

MANIFEST = "RESEARCH_MANIFEST.json"
BASELINES = {
    "pine/indicator.pine": "c7558b9f8e4ab590167dc60eef9028bc0baded806e1d796ff987b141c66314b4",
    "pine/strategy.pine": "42b4e1683397741de60ac1573effb4e18bde737b166d6d143d1373191ea3f5c0",
}
PARENTS = {
    f"pine/experiments/{kind}_signal_diagnostics.pine": f"pine/experiments/{kind}_signal_clarity.pine"
    for kind in ("indicator", "strategy")
}
EVIDENCE = "reports/native-v090/tradingview-strategy-signal-diag-2026-11-08.csv"
EVIDENCE_SHA = "3f305b2431c6bae0cbdd6acff5aea307441b2ccfea8973aaba564f99504f0e93"
GATES = {
    "localVerification": "NOT_EXECUTED_BY_PACKAGER",
    "nativeSourceAttributionAndParity": "BLOCKED",
    "replayAndNonRepainting": "NOT_VERIFIED",
    "performance": "INCONCLUSIVE",
    "liveReadiness": "NOT_APPROVED",
}


def digest(contents: bytes) -> str:
    return hashlib.sha256(contents).hexdigest()


def encoded(value: dict) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf8")


def inventory(archive: zipfile.ZipFile) -> dict:
    return {
        name: {"sha256": digest(archive.read(name)), "bytes": archive.getinfo(name).file_size}
        for name in sorted(archive.namelist()) if name != MANIFEST
    }


def source_context(archive: zipfile.ZipFile) -> dict:
    if json.loads(archive.read("package.json"))["version"] != "0.8.0":
        raise ValueError("research snapshot must preserve project version 0.8.0")
    for path, expected in BASELINES.items():
        if digest(archive.read(path)) != expected:
            raise ValueError(f"frozen baseline hash mismatch: {path}")
    parents = {}
    for path, parent in PARENTS.items():
        matches = re.findall(rb"const string DIAGNOSTIC_PARENT_SHA = '([a-f0-9]{64})'", archive.read(path))
        actual = digest(archive.read(parent))
        if len(matches) != 1 or matches[0].decode() != actual:
            raise ValueError(f"diagnostic parent hash mismatch: {path}")
        parents[path] = {"sha256": digest(archive.read(path)), "parentPath": parent, "parentSha256": actual}
    if digest(archive.read(EVIDENCE)) != EVIDENCE_SHA:
        raise ValueError("preserved native Strategy capture hash mismatch")
    return {"frozenBaselines": BASELINES, "diagnosticSources": parents,
            "rawStrategyCapture": {"path": EVIDENCE, "sha256": EVIDENCE_SHA}}


def verify_research(path: Path) -> dict:
    verify_archive(path)
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("research snapshot contains duplicate archive paths")
        manifest = json.loads(archive.read(MANIFEST))
        if (manifest.get("schema") != "xauusd-research-snapshot/v1"
                or manifest.get("projectVersion") != "0.8.0"
                or manifest.get("target") != "0.9.0-research"
                or manifest.get("releaseStatus") != "RESEARCH_ONLY_NOT_RELEASED"
                or manifest.get("gates") != GATES):
            raise ValueError("invalid research snapshot status/schema")
        if manifest.get("files") != inventory(archive):
            raise ValueError("research snapshot file inventory mismatch")
        if manifest.get("sources") != source_context(archive):
            raise ValueError("research snapshot source context mismatch")
        return {"schema": "xauusd-research-snapshot-receipt/v1", "archiveSha256": digest(path.read_bytes()),
                "manifestSha256": digest(archive.read(MANIFEST)), "includedFiles": len(names),
                "releaseStatus": manifest["releaseStatus"], "sources": manifest["sources"], "gates": GATES}


def package_research(root: Path, output: Path) -> dict:
    root, output = root.resolve(), output.resolve()
    receipt_path = output.with_name(output.name + ".receipt.json")
    if root == output or root in output.parents:
        raise ValueError("research snapshot must be written outside the project root")
    if os.path.lexists(output) or os.path.lexists(receipt_path):
        raise ValueError("research snapshot/receipt already exists; choose a new filename")
    if (root / MANIFEST).exists():
        raise ValueError("project contains the reserved research manifest filename")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".research-snapshot-", dir=output.parent) as directory:
        temporary = Path(directory) / "snapshot.zip"
        create_archive(root, temporary)
        with zipfile.ZipFile(temporary, "a", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            manifest = {"schema": "xauusd-research-snapshot/v1", "projectVersion": "0.8.0",
                        "target": "0.9.0-research", "releaseStatus": "RESEARCH_ONLY_NOT_RELEASED",
                        "gates": GATES, "sources": source_context(archive), "files": inventory(archive),
                        "limits": ["Checksums identify these local bytes; they do not authenticate TradingView or exact editor source.",
                                   "Packaging runs no tests and does not pass native, performance, or live-readiness gates."]}
            archive.writestr(MANIFEST, encoded(manifest))
        receipt = verify_research(temporary)
        temporary_receipt = Path(directory) / "receipt.json"
        temporary_receipt.write_bytes(encoded(receipt))
        # Exclusive links prevent overwriting an older snapshot even if another
        # process creates the requested output after the initial existence check.
        os.link(temporary, output)
        try:
            os.link(temporary_receipt, receipt_path)
        except OSError:
            output.unlink()
            raise
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--output", type=Path, help="new ZIP filename outside the project")
    action.add_argument("--verify", type=Path, help="verify an existing research ZIP without changing it")
    args = parser.parse_args()
    try:
        result = verify_research(args.verify) if args.verify else package_research(args.root, args.output)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (ValueError, KeyError, OSError, zipfile.BadZipFile) as error:
        parser.exit(2, f"Research packaging failed: {error}\n")


if __name__ == "__main__":
    raise SystemExit(main())
