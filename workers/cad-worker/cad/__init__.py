from .contracts import CadObject, CadImportResult
from .transform import (
    CalibrationPoint,
    AffineCalibrationResult,
    calibrate_affine,
    transform_points,
    inverse_transform_points,
)

__all__ = [
    "CadObject",
    "CadImportResult",
    "CalibrationPoint",
    "AffineCalibrationResult",
    "calibrate_affine",
    "transform_points",
    "inverse_transform_points",
]


from .exact_geometry import ExactGeometryEngine, GeometryAnalysis, IoUResult
from .units import CadUnitResolver, UnitResolution, UnitCandidate
from .exact_room_detector import ExactRoomDetector, ExactRoomCandidate
from .ai_cad_matcher_v07 import ExactAiCadMatcher, ExactMatchCandidate
from .space_promotion import SpacePromotionPlanner, SpacePromotionInput, SpacePromotionPlan
