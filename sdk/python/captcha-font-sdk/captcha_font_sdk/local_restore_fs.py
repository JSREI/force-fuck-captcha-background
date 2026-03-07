from __future__ import annotations

from pathlib import Path
import shutil
from typing import List


def scan_all_files(dir_path: str, recursive: bool = True) -> List[str]:
    root = Path(dir_path)
    if recursive:
        files = [path for path in root.rglob("*") if path.is_file()]
    else:
        files = [path for path in root.glob("*") if path.is_file()]
    files.sort()
    return [str(path) for path in files]


def has_dir_entries(dir_path: str) -> bool:
    root = Path(dir_path)
    return any(root.iterdir())


def clear_directory_contents(dir_path: str) -> None:
    root = Path(dir_path)
    for entry in root.iterdir():
        if entry.is_dir():
            shutil.rmtree(entry)
        else:
            entry.unlink(missing_ok=True)
