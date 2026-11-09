#!/usr/bin/env python3
"""Create a shareable project ZIP while excluding local secrets and build state."""
from __future__ import annotations

import argparse
import os
from pathlib import Path, PurePosixPath
import re
import tempfile
import zipfile

EXCLUDED_PARTS = {
    ".git", ".vercel", "node_modules", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", ".next", ".turbo", ".cache", "coverage",
    "dist", "build", "vendor", ".aws", ".ssh", ".gnupg", ".azure", ".docker",
}
EXCLUDED_NAMES = {
    ".DS_Store", ".npmrc", ".pypirc", ".netrc", "credentials", "credentials.json",
    "secrets.json", "secrets.yaml", "secrets.yml", "auth.json",
}
EXCLUDED_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".ppk", ".crt", ".cer", ".der", ".sqlite", ".sqlite3", ".db", ".token", ".secret", ".zip", ".7z", ".tar", ".tgz", ".gz", ".bz2", ".xz"}
SECRET_PATTERNS = (
    re.compile(rb"\b\d{6,12}:[A-Za-z0-9_-]{30,}\b"),  # Telegram bot token shape
    re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"(?im)(?:TELEGRAM_BOT_TOKEN|TRADINGVIEW_WEBHOOK_SECRET)[ \t]*[=:][ \t]*(?!replace-with|<|your-|changeme|placeholder)[^\s\"']{12,}"),
)


def jpeg_huffman_symbol_ranges(contents: bytes) -> list[tuple[int, int]]:
    """Identify structural DHT symbol bytes in a well-framed JPEG, by magic.

    Standard JPEG Huffman symbol sequences can resemble a bot token. Only
    valid, bounded DHT symbol arrays are exempted; metadata, entropy data and
    appended bytes are still scanned. Any malformed framing disables exemption.
    This validates marker structure, not image decoding or hidden information.
    """
    if not contents.startswith(b"\xff\xd8"):
        return []
    ranges: list[tuple[int, int]] = []
    offset, saw_frame, saw_scan = 2, False, False
    frame_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while offset < len(contents):
        if contents[offset] != 0xFF:
            return []
        while offset < len(contents) and contents[offset] == 0xFF:
            offset += 1
        if offset >= len(contents):
            return []
        marker = contents[offset]
        offset += 1
        if marker == 0xD9:
            return ranges if saw_frame and saw_scan else []
        if marker < 0xC0 or marker == 0xD8 or 0xD0 <= marker <= 0xD7 or offset + 2 > len(contents):
            return []
        length = int.from_bytes(contents[offset:offset + 2], "big")
        start, end = offset + 2, offset + length
        if length < 2 or end > len(contents):
            return []
        payload = contents[start:end]
        if marker == 0xC4:
            cursor = 0
            while cursor < len(payload):
                if cursor + 17 > len(payload):
                    return []
                descriptor = payload[cursor]
                if descriptor >> 4 not in (0, 1) or (descriptor & 15) > 3:
                    return []
                counts = payload[cursor + 1:cursor + 17]
                size, remaining = sum(counts), 1
                for count in counts:
                    remaining = remaining * 2 - count
                    if remaining < 0:
                        return []
                symbols_start, symbols_end = cursor + 17, cursor + 17 + size
                if size == 0 or size > 256 or remaining == 0 or symbols_end > len(payload):
                    return []
                symbols = payload[symbols_start:symbols_end]
                if len(set(symbols)) != size or (descriptor >> 4 == 0 and any(s > 15 for s in symbols)):
                    return []
                ranges.append((start + symbols_start, start + symbols_end))
                cursor = symbols_end
            if cursor == 0:
                return []
        elif marker in frame_markers:
            if len(payload) < 6 or payload[5] == 0 or len(payload) != 6 + 3 * payload[5]:
                return []
            if int.from_bytes(payload[1:3], "big") == 0 or int.from_bytes(payload[3:5], "big") == 0:
                return []
            saw_frame = True
        elif marker == 0xDA:
            if not saw_frame or len(payload) < 4 or payload[0] == 0 or len(payload) != 4 + 2 * payload[0]:
                return []
            saw_scan = True
            offset = end
            while offset < len(contents):
                marker_start = contents.find(b"\xff", offset)
                if marker_start < 0:
                    return []
                next_byte = marker_start + 1
                while next_byte < len(contents) and contents[next_byte] == 0xFF:
                    next_byte += 1
                if next_byte >= len(contents):
                    return []
                if contents[next_byte] == 0 or 0xD0 <= contents[next_byte] <= 0xD7:
                    offset = next_byte + 1
                else:
                    offset = marker_start
                    break
            continue
        offset = end
    return []


def contains_credential_pattern(contents: bytes) -> bool:
    structural = jpeg_huffman_symbol_ranges(contents)
    return any(not any(start <= match.start() and match.end() <= end for start, end in structural)
               for pattern in SECRET_PATTERNS for match in pattern.finditer(contents))


def excluded(relative: Path) -> bool:
    parts = relative.parts
    name = relative.name
    if any(part in EXCLUDED_PARTS for part in parts) or parts[:2] == (".config", "gcloud"):
        return True
    if name == ".env.example" and len(parts) == 1:
        return False
    if name in {".env", ".envrc"} or name.startswith(".env.") or name.endswith(".envrc"):
        return True
    if "secret" in name.lower() or "credential" in name.lower():
        return True
    if name in EXCLUDED_NAMES or name.lower().endswith(tuple(EXCLUDED_SUFFIXES)):
        return True
    if name.startswith("id_rsa") or name.startswith("id_ed25519"):
        return True
    return False


def create_archive(root: Path, output: Path) -> int:
    root = root.resolve()
    output = output.resolve()
    if not root.is_dir():
        raise ValueError("project root must be a directory")
    if output == root or root in output.parents:
        raise ValueError("share archive must be written outside the project root")
    if not (root / ".env.example").is_file():
        raise ValueError("project root must contain .env.example")
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=".share-", suffix=".zip", dir=output.parent)
    os.close(fd)
    temporary = Path(temporary_name)
    written = 0
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for directory, dirnames, filenames in os.walk(root, followlinks=False):
                base = Path(directory)
                dirnames[:] = sorted(
                    name for name in dirnames
                    if not excluded((base / name).relative_to(root))
                    and not (base / name).is_symlink()
                )
                for filename in sorted(filenames):
                    path = base / filename
                    relative = path.relative_to(root)
                    if excluded(relative) or path.is_symlink() or not path.is_file():
                        continue
                    archive.write(path, relative.as_posix())
                    written += 1
        verify_archive(temporary)
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    return written


def verify_archive(path: Path) -> None:
    """Fail closed if the generated ZIP contains a forbidden or unsafe member."""
    with zipfile.ZipFile(path, "r") as archive:
        names = archive.namelist()
        if ".env.example" not in names:
            raise ValueError("share archive is missing .env.example")
        for name in names:
            member = PurePosixPath(name)
            if member.is_absolute() or ".." in member.parts or "\\" in name or excluded(Path(*member.parts)):
                raise ValueError("share archive contains a forbidden or unsafe path")
            # Shared Pine sources use .pine.inc, and copied logs can have any
            # suffix. A filename must not disable credential-pattern checks.
            contents = archive.read(name)
            if contains_credential_pattern(contents):
                raise ValueError(f"share archive contains a credential-like value in {name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, required=True, help="ZIP path outside --root")
    args = parser.parse_args()
    count = create_archive(args.root, args.output)
    print(f"Created share archive with {count} files: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
