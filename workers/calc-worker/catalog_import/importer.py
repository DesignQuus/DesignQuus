from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any
import csv
import json
import hashlib


CANONICAL_FIELDS = {
    "manufacturer_code",
    "model_code",
    "model_name",
    "airflow_m3_h",
    "external_static_pressure_pa",
    "sensible_efficiency_pct",
    "total_efficiency_pct",
    "power_input_kw",
    "voltage_v",
    "phase_count",
    "noise_db_a",
    "list_price",
    "lead_time_days",
    "sales_status",
}


@dataclass(frozen=True)
class CatalogRowResult:
    row_no: int
    raw: dict[str, Any]
    normalized: dict[str, Any] | None
    status: str
    errors: list[str]
    warnings: list[str]
    fingerprint: str | None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class CatalogImportResult:
    status: str
    row_count: int
    valid_count: int
    error_count: int
    duplicate_count: int
    rows: list[CatalogRowResult]
    importer_version: str = "ERV_CATALOG_IMPORTER/0.9.0"

    def to_dict(self) -> dict:
        return {
            **asdict(self),
            "rows": [x.to_dict() for x in self.rows],
        }


class CatalogImporter:
    version = "ERV_CATALOG_IMPORTER/0.9.0"

    def __init__(self, mapping: dict[str, Any]):
        self.mapping = mapping

    def import_csv(self, path: str | Path) -> CatalogImportResult:
        with Path(path).open(
            "r",
            encoding=self.mapping.get("encoding", "utf-8-sig"),
            newline="",
        ) as f:
            rows = list(csv.DictReader(f))
        return self.import_rows(rows)

    def import_json(self, path: str | Path) -> CatalogImportResult:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else data["rows"]
        return self.import_rows(rows)

    def import_rows(
        self,
        rows: list[dict[str, Any]],
    ) -> CatalogImportResult:
        results = []
        seen_fingerprints: set[str] = set()
        duplicate_count = 0

        for index, raw in enumerate(rows, start=1):
            normalized, errors, warnings = self._normalize(raw)
            fingerprint = (
                _fingerprint(normalized)
                if normalized and not errors else None
            )

            if fingerprint and fingerprint in seen_fingerprints:
                status = "DUPLICATE"
                duplicate_count += 1
            elif errors:
                status = "ERROR"
            else:
                status = "VALID"
                if fingerprint:
                    seen_fingerprints.add(fingerprint)

            results.append(CatalogRowResult(
                row_no=index,
                raw=raw,
                normalized=normalized,
                status=status,
                errors=errors,
                warnings=warnings,
                fingerprint=fingerprint,
            ))

        valid_count = sum(1 for x in results if x.status == "VALID")
        error_count = sum(1 for x in results if x.status == "ERROR")

        if error_count > 0:
            overall = "REVIEW_REQUIRED"
        elif duplicate_count > 0:
            overall = "REVIEW_REQUIRED"
        else:
            overall = "READY_TO_PUBLISH"

        return CatalogImportResult(
            status=overall,
            row_count=len(results),
            valid_count=valid_count,
            error_count=error_count,
            duplicate_count=duplicate_count,
            rows=results,
        )

    def _normalize(
        self,
        raw: dict[str, Any],
    ) -> tuple[dict[str, Any], list[str], list[str]]:
        errors: list[str] = []
        warnings: list[str] = []

        field_map = self.mapping["field_mapping"]
        units = self.mapping.get("unit_mapping", {})

        normalized: dict[str, Any] = {}
        for canonical, source in field_map.items():
            if canonical not in CANONICAL_FIELDS:
                warnings.append(f"UNKNOWN_CANONICAL_FIELD:{canonical}")
                continue
            normalized[canonical] = raw.get(source)

        normalized["manufacturer_code"] = self.mapping["manufacturer_code"]

        for field in [
            "airflow_m3_h",
            "external_static_pressure_pa",
            "sensible_efficiency_pct",
            "total_efficiency_pct",
            "power_input_kw",
            "voltage_v",
            "noise_db_a",
            "list_price",
        ]:
            if normalized.get(field) not in (None, ""):
                try:
                    normalized[field] = float(normalized[field])
                except (TypeError, ValueError):
                    errors.append(f"INVALID_NUMBER:{field}")

        for field in ["phase_count", "lead_time_days"]:
            if normalized.get(field) not in (None, ""):
                try:
                    normalized[field] = int(float(normalized[field]))
                except (TypeError, ValueError):
                    errors.append(f"INVALID_INTEGER:{field}")

        _normalize_units(normalized, units, errors)

        for required in [
            "manufacturer_code",
            "model_code",
            "model_name",
            "airflow_m3_h",
            "sales_status",
        ]:
            if normalized.get(required) in (None, ""):
                errors.append(f"REQUIRED_FIELD_MISSING:{required}")

        if normalized.get("airflow_m3_h") is not None:
            if normalized["airflow_m3_h"] < 0:
                errors.append("NEGATIVE_AIRFLOW")

        for field in ["sensible_efficiency_pct", "total_efficiency_pct"]:
            value = normalized.get(field)
            if value is not None and not (0 <= value <= 100):
                errors.append(f"OUT_OF_RANGE:{field}")

        normalized["sales_status"] = str(
            normalized.get("sales_status", "")
        ).strip().upper()

        allowed_status = {
            "ACTIVE", "DISCONTINUED", "REPLACED", "SPECIAL_ORDER"
        }
        if normalized["sales_status"] not in allowed_status:
            errors.append("INVALID_SALES_STATUS")

        return normalized, sorted(set(errors)), sorted(set(warnings))


def _normalize_units(
    row: dict[str, Any],
    units: dict[str, str],
    errors: list[str],
) -> None:
    airflow_unit = units.get("airflow")
    if row.get("airflow_m3_h") is not None:
        if airflow_unit in (None, "m3/h", "CMH"):
            pass
        elif airflow_unit == "m3/min":
            row["airflow_m3_h"] *= 60.0
        elif airflow_unit == "L/s":
            row["airflow_m3_h"] *= 3.6
        else:
            errors.append(f"UNSUPPORTED_AIRFLOW_UNIT:{airflow_unit}")

    pressure_unit = units.get("pressure")
    if row.get("external_static_pressure_pa") is not None:
        if pressure_unit in (None, "Pa"):
            pass
        elif pressure_unit == "kPa":
            row["external_static_pressure_pa"] *= 1000.0
        elif pressure_unit == "mmAq":
            row["external_static_pressure_pa"] *= 9.80665
        else:
            errors.append(f"UNSUPPORTED_PRESSURE_UNIT:{pressure_unit}")

    power_unit = units.get("power")
    if row.get("power_input_kw") is not None:
        if power_unit in (None, "kW"):
            pass
        elif power_unit == "W":
            row["power_input_kw"] /= 1000.0
        else:
            errors.append(f"UNSUPPORTED_POWER_UNIT:{power_unit}")


def _fingerprint(row: dict[str, Any]) -> str:
    payload = json.dumps(
        row,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
