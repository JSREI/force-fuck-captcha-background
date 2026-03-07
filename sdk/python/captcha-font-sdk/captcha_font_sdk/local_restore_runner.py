from __future__ import annotations

import json
import time
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional

from .local_restore_fs import scan_all_files
from .local_restore_paths import validate_and_prepare_paths
from .local_restore_types import (
    LocalRestoreConfig,
    LocalRestoreStatus,
    LocalRestoreSummary,
    ProcessingErrorItem,
    ProgressCallback,
    StopChecker,
)
from .local_restore_vote import IMAGE_EXTENSIONS, BucketState, generate_bucket_outputs, process_image_into_buckets


def create_initial_local_restore_status() -> LocalRestoreStatus:
    return LocalRestoreStatus()


def calculate_speed_per_second(status: LocalRestoreStatus) -> float:
    if status.start_time is None:
        return 0.0
    elapsed_ms = int(time.time() * 1000) - status.start_time
    if elapsed_ms <= 0:
        return 0.0
    return round(float(status.processed_files) / (float(elapsed_ms) / 1000.0), 2)


def _emit_progress(status: LocalRestoreStatus, callback: Optional[ProgressCallback]) -> None:
    if callback is None:
        return
    callback(status)


def run_local_restore(
    config: LocalRestoreConfig,
    progress_callback: Optional[ProgressCallback] = None,
    stop_checker: Optional[StopChecker] = None,
) -> LocalRestoreSummary:
    validation = validate_and_prepare_paths(config)
    if not validation.accepted or not validation.normalized_input or not validation.normalized_output:
        raise ValueError(validation.reason or "path_validation_failed")

    status = create_initial_local_restore_status()
    status.status = "running"
    status.input_dir = validation.normalized_input
    status.output_dir = validation.normalized_output
    status.start_time = int(time.time() * 1000)

    Path(status.output_dir).mkdir(parents=True, exist_ok=True)

    all_files = scan_all_files(status.input_dir, recursive=config.recursive)
    image_files = [
        file_path
        for file_path in all_files
        if Path(file_path).suffix.lower() in IMAGE_EXTENSIONS
    ]
    status.total_files = len(all_files)
    status.image_files = len(image_files)
    status.skipped_files = len(all_files) - len(image_files)
    _emit_progress(status, progress_callback)

    buckets: Dict[str, BucketState] = {}
    errors: List[ProcessingErrorItem] = []
    should_stop = stop_checker or (lambda: False)

    for file_path in image_files:
        if should_stop():
            status.stop_requested = True
            break

        status.current_file = file_path
        try:
            process_image_into_buckets(file_path, buckets)
            status.succeeded_files += 1
        except Exception as exc:  # noqa: BLE001
            status.failed_files += 1
            if len(errors) < config.max_error_items:
                errors.append(ProcessingErrorItem(file=file_path, reason=str(exc)))
        finally:
            status.processed_files += 1
            status.bucket_count = len(buckets)
            status.speed_per_second = calculate_speed_per_second(status)
            _emit_progress(status, progress_callback)

    status.current_file = None

    bucket_summaries = generate_bucket_outputs(status.output_dir, buckets.values())
    status.completed_bucket_count = len(bucket_summaries)
    status.bucket_count = len(buckets)

    now_ms = int(time.time() * 1000)
    finished_status = "stopped" if status.stop_requested else "completed"
    status.status = finished_status
    status.end_time = now_ms
    status.speed_per_second = calculate_speed_per_second(status)

    summary = LocalRestoreSummary(
        status=finished_status,  # type: ignore[arg-type]
        input_dir=status.input_dir,
        output_dir=status.output_dir,
        start_time=status.start_time or now_ms,
        end_time=now_ms,
        duration_ms=max(0, now_ms - (status.start_time or now_ms)),
        total_files=status.total_files,
        image_files=status.image_files,
        processed_files=status.processed_files,
        succeeded_files=status.succeeded_files,
        failed_files=status.failed_files,
        skipped_files=status.skipped_files,
        bucket_count=status.bucket_count,
        completed_bucket_count=status.completed_bucket_count,
        output_files=len(bucket_summaries),
        buckets=bucket_summaries,
        errors=errors,
        summary_path=None,
    )

    summary_path = Path(status.output_dir) / "summary.json"
    summary.summary_path = str(summary_path)
    summary_json = asdict(summary)
    summary_path.write_text(json.dumps(summary_json, ensure_ascii=False, indent=2), encoding="utf-8")
    status.summary_path = str(summary_path)

    _emit_progress(status, progress_callback)
    return summary
