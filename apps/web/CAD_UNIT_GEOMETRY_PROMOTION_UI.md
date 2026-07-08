# CAD Unit / Exact Geometry / SPACE Promotion UI

## 화면 1 — CAD Unit Review

```text
DXF Header
$INSUNITS = 0 (Unitless)

추정 후보
1. Millimeters    Score 0.92
2. Centimeters    Score 0.44
3. Meters         Score 0.03

⚠ 자동 확정 금지

[Millimeters 확인] [다른 단위 선택]
```

## 화면 2 — Exact Geometry Review

```text
ROOM-001
Area       24.000 m²
Perimeter  20.000 m
Geometry   VALID

ROOM-002
Area       18.450 m²
Geometry   REPAIRED_SINGLE
⚠ 검토 권장

ROOM-003
Geometry   REPAIRED_FRAGMENTED
⛔ 자동승격 금지
```

## 화면 3 — SPACE Promotion

```text
┌────────────────────────────────────────────────────────┐
│ CAD ROOM        회의실 A                               │
│ Unit            Millimeters / VALIDATED                │
│ Exact Area      24.000 m²                              │
│ Geometry        VALID                                   │
│ AI/CAD Match    AUTO_MATCH 0.96                        │
├────────────────────────────────────────────────────────┤
│ Proposed Space Code        B1-ROOM-001                  │
│ Proposed Space Type        CONFERENCE_ROOM              │
│ Decision                   READY                        │
│ Blockers                   0                            │
├────────────────────────────────────────────────────────┤
│ [승격 실행]                                             │
└────────────────────────────────────────────────────────┘
```
