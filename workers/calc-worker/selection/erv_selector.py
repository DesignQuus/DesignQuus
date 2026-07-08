from __future__ import annotations
from dataclasses import dataclass, asdict

@dataclass(frozen=True)
class ErvProduct:
    model_code: str
    airflow_m3_h: float
    external_static_pressure_pa: float
    power_input_kw: float
    list_price: float
    lead_time_days: int

@dataclass(frozen=True)
class SelectionRequirement:
    required_flow_m3_h: float
    required_static_pressure_pa: float = 0.0
    max_capacity_margin_pct: float = 100.0

def select_erv_candidates(products: list[ErvProduct], req: SelectionRequirement) -> list[dict]:
    candidates: list[dict] = []
    for p in products:
        reasons: list[str] = []
        if p.airflow_m3_h < req.required_flow_m3_h:
            reasons.append("INSUFFICIENT_AIRFLOW")
        if p.external_static_pressure_pa < req.required_static_pressure_pa:
            reasons.append("INSUFFICIENT_STATIC_PRESSURE")
        margin = ((p.airflow_m3_h - req.required_flow_m3_h) / req.required_flow_m3_h * 100) if req.required_flow_m3_h > 0 else 0.0
        technically_valid = not reasons and margin <= req.max_capacity_margin_pct
        technical_score = max(0.0, 100.0 - abs(margin)) if technically_valid else 0.0
        energy_score = max(0.0, 100.0 - p.power_input_kw * 20.0)
        cost_score = max(0.0, 100.0 - p.list_price / 50000.0)
        delivery_score = max(0.0, 100.0 - p.lead_time_days * 2.0)
        total = (technical_score * 0.60 + energy_score * 0.15 + cost_score * 0.15 + delivery_score * 0.10) if technically_valid else 0.0
        candidates.append({
            "product": asdict(p),
            "technically_valid": technically_valid,
            "rejection_reasons": reasons,
            "capacity_margin_pct": round(margin, 4),
            "technical_score": round(technical_score, 4),
            "energy_score": round(energy_score, 4),
            "cost_score": round(cost_score, 4),
            "delivery_score": round(delivery_score, 4),
            "total_score": round(total, 4),
        })
    valid = [c for c in candidates if c["technically_valid"]]
    invalid = [c for c in candidates if not c["technically_valid"]]
    valid.sort(key=lambda x: x["total_score"], reverse=True)
    for rank, c in enumerate(valid, start=1):
        c["rank"] = rank
    for c in invalid:
        c["rank"] = None
    return valid + invalid
