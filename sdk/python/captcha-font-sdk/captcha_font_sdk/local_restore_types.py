from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List, Literal, Optional


LocalRestoreTaskStatus = Literal["idle", "running", "completed", "failed", "stopped"]
LocalRestoreFinishedStatus = Literal["completed", "failed", "stopped"]


@dataclass(frozen=True)
class LocalRestoreConfig:
    input_dir: str
    output_dir: str
    clear_output_before_run: bool = False
    recursive: bool = True
    max_error_items: int = 200


@dataclass(frozen=True)
class ProcessingErrorItem:
    file: str
    reason: str


@dataclass(frozen=True)
class BucketSummary:
    id: str
    width: int
    height: int
    image_count: int
    output_file: str
    output_path: str


@dataclass
class LocalRestoreStatus:
    status: LocalRestoreTaskStatus = "idle"
    input_dir: str = ""
    output_dir: str = ""
    start_time: Optional[int] = None
    end_time: Optional[int] = None
    total_files: int = 0
    image_files: int = 0
    processed_files: int = 0
    succeeded_files: int = 0
    failed_files: int = 0
    skipped_files: int = 0
    bucket_count: int = 0
    completed_bucket_count: int = 0
    speed_per_second: float = 0.0
    current_file: Optional[str] = None
    stop_requested: bool = False
    summary_path: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class LocalRestoreSummary:
    status: LocalRestoreFinishedStatus
    input_dir: str
    output_dir: str
    start_time: int
    end_time: int
    duration_ms: int
    total_files: int
    image_files: int
    processed_files: int
    succeeded_files: int
    failed_files: int
    skipped_files: int
    bucket_count: int
    completed_bucket_count: int
    output_files: int
    buckets: List[BucketSummary]
    errors: List[ProcessingErrorItem]
    summary_path: Optional[str] = None


ProgressCallback = Callable[[LocalRestoreStatus], None]
StopChecker = Callable[[], bool]
