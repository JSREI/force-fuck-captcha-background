from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .local_restore_fs import clear_directory_contents, has_dir_entries
from .local_restore_types import LocalRestoreConfig


@dataclass(frozen=True)
class ValidationResult:
    accepted: bool
    reason: Optional[str] = None
    normalized_input: Optional[str] = None
    normalized_output: Optional[str] = None


def validate_and_prepare_paths(config: LocalRestoreConfig) -> ValidationResult:
    if not config.input_dir or not config.output_dir:
        return ValidationResult(accepted=False, reason="input_or_output_missing")

    input_path = Path(config.input_dir).expanduser().resolve()
    output_path = Path(config.output_dir).expanduser().resolve()

    if not input_path.exists() or not input_path.is_dir():
        return ValidationResult(accepted=False, reason="input_dir_invalid")
    if input_path == output_path:
        return ValidationResult(accepted=False, reason="output_same_as_input")

    if output_path.exists():
        if not output_path.is_dir():
            return ValidationResult(accepted=False, reason="output_dir_invalid")
        if has_dir_entries(str(output_path)):
            if not config.clear_output_before_run:
                return ValidationResult(accepted=False, reason="output_not_empty")
            clear_directory_contents(str(output_path))

    return ValidationResult(
        accepted=True,
        normalized_input=str(input_path),
        normalized_output=str(output_path),
    )
