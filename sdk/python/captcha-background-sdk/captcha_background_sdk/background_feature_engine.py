from __future__ import annotations

import math
from typing import Iterable, List, Sequence, Tuple

RGBA = Tuple[int, int, int, int]


def _to_gray(pixel: RGBA) -> float:
    r, g, b, _a = pixel
    return 0.299 * r + 0.587 * g + 0.114 * b


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _build_histogram(values: Sequence[float], bins: int) -> List[float]:
    if bins <= 0:
        raise ValueError("bins must be positive")
    if not values:
        return [0.0 for _ in range(bins)]

    hist = [0 for _ in range(bins)]
    for value in values:
        index = min(bins - 1, int(value * bins / 256.0))
        hist[index] += 1
    total = float(len(values))
    return [count / total for count in hist]


def _hist_entropy(histogram: Sequence[float]) -> float:
    entropy = 0.0
    for probability in histogram:
        if probability > 0.0:
            entropy -= probability * math.log2(probability)
    return entropy


def _split_range(length: int, parts: int, index: int) -> Tuple[int, int]:
    start = int(index * length / parts)
    end = int((index + 1) * length / parts)
    if end <= start:
        end = min(length, start + 1)
    return start, end


def _cell_gray_values(
    gray: Sequence[float],
    width: int,
    x0: int,
    x1: int,
    y0: int,
    y1: int,
) -> List[float]:
    values: List[float] = []
    for y in range(y0, y1):
        base = y * width
        values.extend(gray[base + x0 : base + x1])
    return values


def _edge_density(
    gray: Sequence[float],
    width: int,
    height: int,
    threshold: float,
    x0: int,
    x1: int,
    y0: int,
    y1: int,
) -> float:
    if x1 - x0 <= 1 or y1 - y0 <= 1:
        return 0.0

    edge_hits = 0
    checks = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            current = gray[y * width + x]
            if x + 1 < x1:
                checks += 1
                if abs(current - gray[y * width + (x + 1)]) >= threshold:
                    edge_hits += 1
            if y + 1 < y1:
                checks += 1
                if abs(current - gray[(y + 1) * width + x]) >= threshold:
                    edge_hits += 1
    return _safe_div(edge_hits, checks)


def _mean_std(values: Sequence[float]) -> Tuple[float, float]:
    if not values:
        return 0.0, 0.0
    mean = sum(values) / len(values)
    variance = sum((value - mean) ** 2 for value in values) / len(values)
    return mean, math.sqrt(max(0.0, variance))


def _normalize_levels(levels: Iterable[int] | None) -> List[int]:
    if levels is None:
        return [1, 2, 4]
    cleaned = sorted({int(level) for level in levels if int(level) > 0})
    if not cleaned:
        raise ValueError("levels must include at least one positive integer")
    return cleaned


def extract_background_texture_metrics(
    rgba_pixels: Sequence[RGBA],
    width: int,
    height: int,
    grid_rows: int = 4,
    grid_cols: int = 4,
    histogram_bins: int = 16,
    edge_threshold: float = 18.0,
) -> dict:
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be positive")
    if grid_rows <= 0 or grid_cols <= 0:
        raise ValueError("grid_rows and grid_cols must be positive")
    if len(rgba_pixels) != width * height:
        raise ValueError("rgba_pixels length does not match width * height")

    gray = [_to_gray(pixel) for pixel in rgba_pixels]
    mean_intensity, std_intensity = _mean_std(gray)
    histogram = _build_histogram(gray, histogram_bins)
    entropy = _hist_entropy(histogram)
    edge_density = _edge_density(
        gray,
        width=width,
        height=height,
        threshold=edge_threshold,
        x0=0,
        x1=width,
        y0=0,
        y1=height,
    )

    grid_energy: List[float] = []
    for row in range(grid_rows):
        y0, y1 = _split_range(height, grid_rows, row)
        for col in range(grid_cols):
            x0, x1 = _split_range(width, grid_cols, col)
            cell_values = _cell_gray_values(gray, width, x0, x1, y0, y1)
            _mean, cell_std = _mean_std(cell_values)
            energy = _clamp(cell_std / 128.0, 0.0, 1.0)
            grid_energy.append(energy)

    return {
        "mean_intensity": float(mean_intensity),
        "std_intensity": float(std_intensity),
        "entropy": float(entropy),
        "edge_density": float(edge_density),
        "histogram": [float(value) for value in histogram],
        "grid_energy": [float(value) for value in grid_energy],
        "stats": {
            "width": float(width),
            "height": float(height),
            "grid_rows": float(grid_rows),
            "grid_cols": float(grid_cols),
            "histogram_bins": float(histogram_bins),
            "edge_threshold": float(edge_threshold),
        },
    }


def extract_background_deep_vector(
    rgba_pixels: Sequence[RGBA],
    width: int,
    height: int,
    levels: Iterable[int] | None = None,
    edge_threshold: float = 18.0,
) -> dict:
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be positive")
    if len(rgba_pixels) != width * height:
        raise ValueError("rgba_pixels length does not match width * height")

    normalized_levels = _normalize_levels(levels)
    gray = [_to_gray(pixel) for pixel in rgba_pixels]

    vector_1d: List[float] = []
    patch_count = 0
    for level in normalized_levels:
        for row in range(level):
            y0, y1 = _split_range(height, level, row)
            for col in range(level):
                x0, x1 = _split_range(width, level, col)
                patch_values = _cell_gray_values(gray, width, x0, x1, y0, y1)
                mean, std = _mean_std(patch_values)
                edges = _edge_density(
                    gray,
                    width=width,
                    height=height,
                    threshold=edge_threshold,
                    x0=x0,
                    x1=x1,
                    y0=y0,
                    y1=y1,
                )
                vector_1d.extend(
                    [
                        _clamp(mean / 255.0, 0.0, 1.0),
                        _clamp(std / 128.0, 0.0, 1.0),
                        _clamp(edges, 0.0, 1.0),
                    ]
                )
                patch_count += 1

    return {
        "levels": normalized_levels,
        "patch_count": patch_count,
        "vector_1d": [float(value) for value in vector_1d],
        "stats": {
            "width": float(width),
            "height": float(height),
            "level_count": float(len(normalized_levels)),
            "edge_threshold": float(edge_threshold),
            "vector_length": float(len(vector_1d)),
        },
    }
