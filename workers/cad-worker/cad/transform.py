from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Iterable
import math
import numpy as np


@dataclass(frozen=True)
class CalibrationPoint:
    cad_x: float
    cad_y: float
    page_x: float
    page_y: float
    label: str | None = None

    def validate(self) -> None:
        if not (0.0 <= self.page_x <= 1.0):
            raise ValueError("page_x must be within [0, 1]")
        if not (0.0 <= self.page_y <= 1.0):
            raise ValueError("page_y must be within [0, 1]")


@dataclass(frozen=True)
class AffineCalibrationResult:
    matrix: list[list[float]]
    inverse_matrix: list[list[float]]
    rmse: float
    max_error: float
    control_point_count: int
    residual_errors: list[float]

    def to_dict(self) -> dict:
        return asdict(self)


def _design_matrix(points: list[CalibrationPoint]) -> tuple[np.ndarray, np.ndarray]:
    a_rows = []
    b_vals = []
    for p in points:
        p.validate()
        x, y = p.cad_x, p.cad_y
        u, v = p.page_x, p.page_y
        a_rows.append([x, y, 1.0, 0.0, 0.0, 0.0])
        a_rows.append([0.0, 0.0, 0.0, x, y, 1.0])
        b_vals.extend([u, v])
    return np.asarray(a_rows, dtype=float), np.asarray(b_vals, dtype=float)


def calibrate_affine(points: list[CalibrationPoint]) -> AffineCalibrationResult:
    if len(points) < 3:
        raise ValueError("At least 3 control points are required")

    a, b = _design_matrix(points)
    rank = np.linalg.matrix_rank(a)
    if rank < 6:
        raise ValueError("Control points are degenerate or collinear")

    params, *_ = np.linalg.lstsq(a, b, rcond=None)
    m = np.array([
        [params[0], params[1], params[2]],
        [params[3], params[4], params[5]],
        [0.0,       0.0,       1.0],
    ], dtype=float)

    det = np.linalg.det(m)
    if abs(det) < 1e-15:
        raise ValueError("Affine matrix is not invertible")

    inv = np.linalg.inv(m)

    residuals = []
    for p in points:
        predicted = m @ np.array([p.cad_x, p.cad_y, 1.0])
        error = math.dist(
            [float(predicted[0]), float(predicted[1])],
            [p.page_x, p.page_y],
        )
        residuals.append(error)

    rmse = math.sqrt(sum(e * e for e in residuals) / len(residuals))
    max_error = max(residuals)

    return AffineCalibrationResult(
        matrix=m.tolist(),
        inverse_matrix=inv.tolist(),
        rmse=rmse,
        max_error=max_error,
        control_point_count=len(points),
        residual_errors=residuals,
    )


def transform_points(
    matrix: list[list[float]],
    points: Iterable[tuple[float, float]],
) -> list[tuple[float, float]]:
    m = np.asarray(matrix, dtype=float)
    result = []
    for x, y in points:
        p = m @ np.array([x, y, 1.0])
        result.append((float(p[0]), float(p[1])))
    return result


def inverse_transform_points(
    inverse_matrix: list[list[float]],
    points: Iterable[tuple[float, float]],
) -> list[tuple[float, float]]:
    return transform_points(inverse_matrix, points)


def validate_page_points(points: Iterable[tuple[float, float]]) -> None:
    for x, y in points:
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
            raise ValueError(
                f"Transformed page point out of range: ({x}, {y})"
            )
