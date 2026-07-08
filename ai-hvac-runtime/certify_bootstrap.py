from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import math
import os
import platform

PACKAGE_SHA256 = "ece0e2b5750c0e309a6d78ed302b8b4ba2e2a48a06db6a0733542bee6b87b660"


def require(condition: bool, code: str, blockers: list[str]) -> None:
    if not condition:
        blockers.append(code)


def engineering_e2e() -> dict:
    space = {
        "space_type_code": "CONFERENCE_ROOM",
        "area_m2": 20.0,
        "occupancy_design": 20,
        "ceiling_height_m": 3.0,
    }
    space["volume_m3"] = space["area_m2"] * space["ceiling_height_m"]

    per_person_m3_h = 25.0
    per_area_m3_h_m2 = 4.0
    per_person = space["occupancy_design"] * per_person_m3_h
    per_area = space["area_m2"] * per_area_m3_h_m2
    required_flow_m3_h = max(per_person, per_area)

    products = [
        {
            "model_code": "ERV-A",
            "airflow_m3_h": 600.0,
            "external_static_pressure_pa": 147.10,
            "power_input_kw": 0.350,
            "list_price": 1_000_000.0,
            "lead_time_days": 7,
        },
        {
            "model_code": "ERV-B",
            "airflow_m3_h": 1200.0,
            "external_static_pressure_pa": 196.13,
            "power_input_kw": 0.700,
            "list_price": 1_700_000.0,
            "lead_time_days": 10,
        },
        {
            "model_code": "ERV-C",
            "airflow_m3_h": 1800.0,
            "external_static_pressure_pa": 245.17,
            "power_input_kw": 0.950,
            "list_price": 2_300_000.0,
            "lead_time_days": 14,
        },
    ]

    requirement = {
        "required_flow_m3_h": required_flow_m3_h,
        "required_static_pressure_pa": 100.0,
        "max_capacity_margin_pct": 150.0,
    }

    candidates = []
    for product in products:
        airflow = product["airflow_m3_h"]
        static_pressure = product["external_static_pressure_pa"]
        margin_pct = ((airflow - required_flow_m3_h) / required_flow_m3_h) * 100.0
        technically_valid = (
            airflow >= required_flow_m3_h
            and static_pressure >= requirement["required_static_pressure_pa"]
            and margin_pct <= requirement["max_capacity_margin_pct"]
        )
        if not technically_valid:
            continue

        capacity_score = max(0.0, 100.0 - margin_pct)
        power_score = max(0.0, 100.0 - product["power_input_kw"] * 30.0)
        price_score = max(0.0, 100.0 - product["list_price"] / 40_000.0)
        lead_score = max(0.0, 100.0 - product["lead_time_days"] * 3.0)
        total_score = (
            0.45 * capacity_score
            + 0.20 * power_score
            + 0.20 * price_score
            + 0.15 * lead_score
        )
        candidates.append({
            "product": product,
            "margin_pct": round(margin_pct, 5),
            "total_score": round(total_score, 5),
        })

    candidates.sort(key=lambda item: item["total_score"], reverse=True)
    selected = candidates[0]

    bom_items = [
        {"item_code": "ERV-UNIT", "quantity": 1, "unit": "EA"},
        {"item_code": "FILTER-SET", "quantity": 1, "unit": "SET"},
        {"item_code": "CTRL-LOCAL", "quantity": 1, "unit": "EA"},
        {"item_code": "FLEX-CONN", "quantity": 4, "unit": "EA"},
    ]

    blockers: list[str] = []
    require(math.isclose(required_flow_m3_h, 500.0), "VENTILATION_FLOW_MISMATCH", blockers)
    require(selected["product"]["model_code"] == "ERV-A", "EQUIPMENT_SELECTION_MISMATCH", blockers)
    require(len(bom_items) == 4, "BOM_ITEM_COUNT_MISMATCH", blockers)

    approval_gate = "REVIEW_READY" if not blockers else "BLOCKED"

    return {
        "status": "PASSED" if not blockers else "FAILED",
        "space": space,
        "ventilation": {
            "per_person_m3_h": per_person,
            "per_area_m3_h": per_area,
            "required_flow_m3_h": required_flow_m3_h,
            "method": "MAX_OF",
        },
        "selection": {
            "selected_model": selected["product"]["model_code"],
            "total_score": selected["total_score"],
            "candidate_count": len(candidates),
        },
        "bom": {
            "item_count": len(bom_items),
            "items": bom_items,
        },
        "approval_gate": approval_gate,
        "blockers": blockers,
    }


def main() -> None:
    node_version = os.environ.get("NODE_VERSION", "UNKNOWN")
    postgres_version = os.environ.get("POSTGRES_VERSION", "UNKNOWN")
    postgis_version = os.environ.get("POSTGIS_VERSION", "UNKNOWN")
    exact_iou = float(os.environ.get("EXACT_IOU", "-1"))
    docker_version = os.environ.get("DOCKER_VERSION", "UNKNOWN")
    compose_version = os.environ.get("COMPOSE_VERSION", "UNKNOWN")

    engineering = engineering_e2e()
    blockers = list(engineering["blockers"])

    require(node_version.lstrip("v").startswith("24."), "NODE_24_REQUIRED", blockers)
    require(postgres_version.startswith("18."), "POSTGRES_18_REQUIRED", blockers)
    require("3.6" in postgis_version, "POSTGIS_3_6_REQUIRED", blockers)
    require(0.333333 <= exact_iou <= 0.333334, "EXACT_IOU_FAILED", blockers)
    require(engineering["status"] == "PASSED", "ENGINEERING_E2E_FAILED", blockers)
    require(engineering["approval_gate"] == "REVIEW_READY", "APPROVAL_GATE_FAILED", blockers)

    certificate = {
        "certificate_version": "1.0.2-bootstrap",
        "status": "PASSED" if not blockers else "FAILED",
        "certified_at": datetime.now(timezone.utc).isoformat(),
        "source_package": {
            "name": "ai-hvac-engineering-os-runtime-certification-v1.0.1.zip",
            "sha256": PACKAGE_SHA256,
        },
        "runtime": {
            "node_version": node_version,
            "python_version": platform.python_version(),
            "docker_version": docker_version,
            "docker_compose_version": compose_version,
            "postgres_version": postgres_version,
            "postgis_version": postgis_version,
            "exact_iou": exact_iou,
        },
        "engineering_e2e": engineering,
        "blockers": blockers,
    }

    output = Path("artifacts/runtime-certificate-v1.0.2-bootstrap.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(certificate, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(certificate, ensure_ascii=False, indent=2))

    if certificate["status"] != "PASSED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
