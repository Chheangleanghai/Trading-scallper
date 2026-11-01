#!/usr/bin/env python3
"""Create a shareable project ZIP while excluding local secrets and build state."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import tempfile
import zipfile

EXCLUDED_PARTS = {
    ".git", ".vercel", "node_modules", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", ".next", ".turbo", ".cache", "coverage",
    "dist", "build", "vendor",
}
EXCLUDED_NAMES = {".DS_Store", ".npmrc", "credentials", "credentials.json"}
EXCLUDED_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".db"}


def excluded(relative: Path) -> bool:
    parts = relative.parts
    name = relative.name
    if any(part in EXCLUDED_PARTS for part in parts):
        return True
    if name == ".env.example" and len(parts) == 1:
        return False
    if name == ".env" or name.startswith(".env."):
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
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    return written


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
