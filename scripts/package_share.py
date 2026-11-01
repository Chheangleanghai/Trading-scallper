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
TEXT_SUFFIXES = {".txt", ".md", ".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini", ".ts", ".js", ".mjs", ".py", ".sh", ".html", ".csv", ".pine", ".example"}
SECRET_PATTERNS = (
    re.compile(rb"\b\d{6,12}:[A-Za-z0-9_-]{30,}\b"),  # Telegram bot token shape
    re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"(?im)(?:TELEGRAM_BOT_TOKEN|TRADINGVIEW_WEBHOOK_SECRET)[ \t]*[=:][ \t]*(?!replace-with|<|your-|changeme|placeholder)[^\s\"']{12,}"),
)


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
            if Path(name).suffix.lower() in TEXT_SUFFIXES:
                contents = archive.read(name)
                if any(pattern.search(contents) for pattern in SECRET_PATTERNS):
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
