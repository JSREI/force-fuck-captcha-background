from __future__ import annotations

import json
import sys
from dataclasses import asdict, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any

import captcha_background_sdk as sdk


def _to_jsonable(value: Any):
    if is_dataclass(value):
        return _to_jsonable(asdict(value))
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {k: _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(v) for v in value]
    return value


def main() -> int:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            raise ValueError("missing payload")
        payload = json.loads(raw)

        cls_name = payload.get("class", "CaptchaVisionSDK")
        method = payload.get("method")
        args = payload.get("args", [])
        kwargs = payload.get("kwargs", {}) or {}
        init = payload.get("init", {}) or {}
        background_dir = payload.get("background_dir")

        if not method:
            raise ValueError("missing method")

        cls = getattr(sdk, cls_name)
        instance = cls(**init) if init else cls()

        if background_dir and hasattr(instance, "build_background_index") and method != "build_background_index":
            instance.build_background_index(background_dir)

        fn = getattr(instance, method)
        result = fn(*args, **kwargs)

        output = {"type": "result", "data": _to_jsonable(result)}
        sys.stdout.write(json.dumps(output, ensure_ascii=False))
        return 0
    except Exception as exc:
        error = {"type": "error", "error": str(exc)}
        sys.stdout.write(json.dumps(error, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
