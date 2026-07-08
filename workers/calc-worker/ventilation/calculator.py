from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Literal

Method = Literal["PER_PERSON", "PER_AREA", "ACH", "MAX_OF", "SUM_OF"]

@dataclass(frozen=True)
class VentilationInput:
    method: Method
    occupancy_people: float | None = None
    area_m2: float | None = None
    volume_m3: float | None = None
    per_person_m3_h: float | None = None
    per_area_m3_h_m2: float | None = None
    air_changes_per_hour: float | None = None

    def validate(self) -> None:
        values = {
            "occupancy_people": self.occupancy_people,
            "area_m2": self.area_m2,
            "volume_m3": self.volume_m3,
            "per_person_m3_h": self.per_person_m3_h,
            "per_area_m3_h_m2": self.per_area_m3_h_m2,
            "air_changes_per_hour": self.air_changes_per_hour,
        }
        for name, value in values.items():
            if value is not None and value < 0:
                raise ValueError(f"{name} must be >= 0")
        if self.method == "PER_PERSON":
            self._require("occupancy_people", "per_person_m3_h")
        elif self.method == "PER_AREA":
            self._require("area_m2", "per_area_m3_h_m2")
        elif self.method == "ACH":
            self._require("volume_m3", "air_changes_per_hour")
        elif self.method in ("MAX_OF", "SUM_OF"):
            if not self._available_contributors():
                raise ValueError(f"{self.method} requires at least one complete contributor")
        else:
            raise ValueError(f"Unsupported method: {self.method}")

    def _require(self, *names: str) -> None:
        missing = [name for name in names if getattr(self, name) is None]
        if missing:
            raise ValueError(f"Missing required values: {', '.join(missing)}")

    def _available_contributors(self) -> list[str]:
        out: list[str] = []
        if self.occupancy_people is not None and self.per_person_m3_h is not None:
            out.append("PER_PERSON")
        if self.area_m2 is not None and self.per_area_m3_h_m2 is not None:
            out.append("PER_AREA")
        if self.volume_m3 is not None and self.air_changes_per_hour is not None:
            out.append("ACH")
        return out

@dataclass(frozen=True)
class VentilationResult:
    required_flow_m3_h: float
    method: Method
    contributors_m3_h: dict[str, float]
    governing_contributor: str | None
    formula_trace: list[str]
    engine_version: str = "VENTILATION_FLOW/0.2.0"
    def to_dict(self) -> dict:
        return asdict(self)

def _contributors(data: VentilationInput) -> tuple[dict[str, float], list[str]]:
    values: dict[str, float] = {}
    trace: list[str] = []
    if data.occupancy_people is not None and data.per_person_m3_h is not None:
        value = data.occupancy_people * data.per_person_m3_h
        values["PER_PERSON"] = value
        trace.append(f"PER_PERSON = {data.occupancy_people} × {data.per_person_m3_h} = {value} m3/h")
    if data.area_m2 is not None and data.per_area_m3_h_m2 is not None:
        value = data.area_m2 * data.per_area_m3_h_m2
        values["PER_AREA"] = value
        trace.append(f"PER_AREA = {data.area_m2} × {data.per_area_m3_h_m2} = {value} m3/h")
    if data.volume_m3 is not None and data.air_changes_per_hour is not None:
        value = data.volume_m3 * data.air_changes_per_hour
        values["ACH"] = value
        trace.append(f"ACH = {data.volume_m3} × {data.air_changes_per_hour} = {value} m3/h")
    return values, trace

def calculate_ventilation_flow(data: VentilationInput) -> VentilationResult:
    data.validate()
    values, trace = _contributors(data)
    if data.method in ("PER_PERSON", "PER_AREA", "ACH"):
        required = values[data.method]
        governing = data.method
    elif data.method == "MAX_OF":
        governing = max(values, key=values.get)
        required = values[governing]
        trace.append(f"MAX_OF = max({values}) = {required} m3/h")
    else:
        governing = None
        required = sum(values.values())
        trace.append(f"SUM_OF = sum({values}) = {required} m3/h")
    return VentilationResult(
        required_flow_m3_h=round(required, 6),
        method=data.method,
        contributors_m3_h={k: round(v, 6) for k, v in values.items()},
        governing_contributor=governing,
        formula_trace=trace,
    )
