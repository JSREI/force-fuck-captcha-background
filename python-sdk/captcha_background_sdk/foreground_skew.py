from __future__ import annotations

import math
from typing import Iterable, List, Tuple

Pixel = Tuple[int, int]


def _normalize_angle(angle: float) -> float:
    while angle > 45.0:
        angle -= 90.0
    while angle < -45.0:
        angle += 90.0
    return angle


def estimate_foreground_skew(
    pixels: Iterable[Pixel],
    min_pixels: int = 20,
    max_abs_angle: float = 45.0,
) -> dict:
    sampled: List[Pixel] = list(pixels)
    if len(sampled) < min_pixels:
        return {
            "angle_degrees": 0.0,
            "confidence": 0.0,
            "pixel_count": len(sampled),
            "eigen_ratio": 0.0,
        }

    xs = [float(x) for x, _ in sampled]
    ys = [float(y) for _, y in sampled]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)

    cov_xx = 0.0
    cov_xy = 0.0
    cov_yy = 0.0
    for x, y in sampled:
        dx = float(x) - mean_x
        dy = float(y) - mean_y
        cov_xx += dx * dx
        cov_xy += dx * dy
        cov_yy += dy * dy

    cov_xx /= len(sampled)
    cov_xy /= len(sampled)
    cov_yy /= len(sampled)

    trace = cov_xx + cov_yy
    delta = max(0.0, (cov_xx - cov_yy) ** 2 + 4.0 * cov_xy * cov_xy)
    root_delta = math.sqrt(delta)

    lambda1 = 0.5 * (trace + root_delta)
    lambda2 = 0.5 * (trace - root_delta)

    angle_radians = 0.5 * math.atan2(2.0 * cov_xy, cov_xx - cov_yy)
    angle_degrees = _normalize_angle(math.degrees(angle_radians))
    angle_degrees = max(-max_abs_angle, min(max_abs_angle, angle_degrees))

    confidence = 0.0
    if lambda1 > 1e-9:
        confidence = max(0.0, min(1.0, (lambda1 - lambda2) / lambda1))

    return {
        "angle_degrees": float(angle_degrees),
        "confidence": float(confidence),
        "pixel_count": len(sampled),
        "eigen_ratio": float((lambda1 - lambda2) / lambda1) if lambda1 > 1e-9 else 0.0,
    }
