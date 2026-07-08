# CAD Calibration UI

## Route

```text
/projects/[projectId]/revisions/[revisionId]/cad-calibration/[calibrationId]
```

## 화면

```text
┌───────────────────────────────┬──────────────────────────────┐
│ PDF Viewer                    │ CAD Object Viewer            │
│ PAGE_NORMALIZED               │ CAD_MODEL                    │
│                               │                              │
│ Point A ●                     │ ● Point A                    │
│ Point B ●                     │ ● Point B                    │
│ Point C ●                     │ ● Point C                    │
├───────────────────────────────┴──────────────────────────────┤
│ Control Points                                               │
│ A: CAD(x,y) ↔ PAGE(x,y)                                      │
│ B: CAD(x,y) ↔ PAGE(x,y)                                      │
│ C: CAD(x,y) ↔ PAGE(x,y)                                      │
├──────────────────────────────────────────────────────────────┤
│ RMSE | MAX ERROR | TOLERANCE | STATUS                        │
│ [재계산] [검증 승인]                                          │
└──────────────────────────────────────────────────────────────┘
```

## Overlay

Transform이 VALIDATED이면:
- CAD LINE → PDF Polyline
- CAD Closed Polyline → PDF Polygon
- CAD TEXT → PDF Point Label
- CAD BLOCK_REFERENCE → PDF Point/Icon

를 표시합니다.
