from __future__ import annotations

from datetime import date
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
CALC_WORKER = ROOT / "workers/calc-worker"
sys.path.insert(0, str(CALC_WORKER))

from catalog_import import CatalogImporter
from pipeline import SpaceVentilationPipeline
from selection import ErvProduct, SelectionRequirement, select_erv_candidates
from space_profile import AttributeCandidate, SpaceProfileResolver
from ventilation_rule import VentilationRuleEngine


def main() -> None:
    # 1. Engineering SPACE attributes
    attributes = [
        AttributeCandidate(
            "space_type_code",
            "CONFERENCE_ROOM",
            "USER_CONFIRMED",
            1.0,
        ),
        AttributeCandidate(
            "area_m2",
            20.0,
            "CAD_EXACT",
            1.0,
        ),
        AttributeCandidate(
            "occupancy_design",
            20,
            "USER_CONFIRMED",
            1.0,
        ),
        AttributeCandidate(
            "ceiling_height_m",
            3.0,
            "USER_CONFIRMED",
            1.0,
        ),
    ]

    # 2. Rule + deterministic calculation
    rule_engine = VentilationRuleEngine.from_json(
        ROOT / "config/ventilation-rule-set.demo.v0.8.json"
    )
    pipeline = SpaceVentilationPipeline(
        profile_resolver=SpaceProfileResolver(),
        rule_engine=rule_engine,
    )
    ventilation = pipeline.run(
        attributes,
        reference_date=date(2026, 7, 8),
    )
    assert ventilation.status == "READY_FOR_SELECTION"
    assert ventilation.selection_requirement is not None

    required_flow = float(
        ventilation.selection_requirement["required_flow_m3_h"]
    )

    # 3. Manufacturer catalog import + unit normalization
    mapping = json.loads(
        (
            ROOT / "catalog/mappings/demo-erv-csv-mapping.v0.9.json"
        ).read_text(encoding="utf-8")
    )
    catalog_result = CatalogImporter(mapping).import_csv(
        ROOT / "catalog/sample/demo-erv-catalog-v0.9.csv"
    )
    assert catalog_result.status == "READY_TO_PUBLISH"

    products = []
    for row in catalog_result.rows:
        if row.status != "VALID" or row.normalized is None:
            continue
        value = row.normalized
        products.append(
            ErvProduct(
                model_code=str(value["model_code"]),
                airflow_m3_h=float(value["airflow_m3_h"]),
                external_static_pressure_pa=float(
                    value.get("external_static_pressure_pa") or 0
                ),
                power_input_kw=float(value.get("power_input_kw") or 0),
                list_price=float(value.get("list_price") or 0),
                lead_time_days=int(value.get("lead_time_days") or 0),
            )
        )

    # 4. Equipment selection
    candidates = select_erv_candidates(
        products,
        SelectionRequirement(
            required_flow_m3_h=required_flow,
            required_static_pressure_pa=100.0,
            max_capacity_margin_pct=150.0,
        ),
    )
    valid_candidates = [
        item for item in candidates if item["technically_valid"]
    ]
    assert valid_candidates, "No valid ERV candidate"
    selected = valid_candidates[0]

    # 5. Design BOM
    bom_rules = json.loads(
        (ROOT / "bom/rules/erv-basic.parts.json").read_text(
            encoding="utf-8"
        )
    )
    selected_equipment_count = 1
    bom_items = []
    for index, rule in enumerate(bom_rules["items"], start=1):
        formula = rule["quantity_formula"]
        if formula == "selected_equipment_count":
            quantity = selected_equipment_count
        elif formula == "selected_equipment_count * 4":
            quantity = selected_equipment_count * 4
        else:
            raise ValueError(f"Unsupported demo BOM formula: {formula}")

        bom_items.append(
            {
                "line_no": index,
                "item_code": rule["item_code"],
                "description": rule["description"],
                "quantity": quantity,
                "unit": rule["unit"],
            }
        )

    # 6. Approval quality gate
    blockers = []
    if ventilation.blockers:
        blockers.extend(ventilation.blockers)
    if not selected:
        blockers.append("EQUIPMENT_NOT_SELECTED")
    if not bom_items:
        blockers.append("DESIGN_BOM_MISSING")

    approval_status = "REVIEW_READY" if not blockers else "BLOCKED"
    assert approval_status == "REVIEW_READY"

    report = {
        "scenario": "SPACE_TO_ERV_DESIGN_BOM",
        "status": "PASSED",
        "space": {
            "space_type_code": "CONFERENCE_ROOM",
            "area_m2": 20.0,
            "occupancy_design": 20,
            "volume_m3": 60.0,
        },
        "ventilation": {
            "required_flow_m3_h": required_flow,
            "rule_code": ventilation.selection_requirement[
                "source_rule_code"
            ],
            "pipeline_version": ventilation.pipeline_version,
        },
        "catalog": {
            "rows": catalog_result.row_count,
            "valid": catalog_result.valid_count,
        },
        "selection": {
            "selected_model": selected["product"]["model_code"],
            "rank": selected["rank"],
            "total_score": selected["total_score"],
        },
        "bom": {
            "item_count": len(bom_items),
            "items": bom_items,
        },
        "approval_gate": {
            "status": approval_status,
            "blockers": blockers,
        },
    }

    output = ROOT / "artifacts/e2e-engineering-v1.0.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
