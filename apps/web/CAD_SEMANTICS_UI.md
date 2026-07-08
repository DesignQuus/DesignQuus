# CAD Semantics Review UI v0.6

## 화면 1 — Layer Classification

```text
Layer              Category          Confidence
A-ROOM             ROOM_BOUNDARY     0.93
A-ROOM-TEXT        ROOM_TEXT         0.89
M-HVAC-EQUIP       HVAC_EQUIPMENT    0.91
A-WALL             WALL              0.86
```

사용자는 분류를 수정할 수 있으며 수정은 정책 개선 데이터로 남깁니다.

## 화면 2 — ROOM Candidates

PDF/CAD Overlay:
- Green: Accepted Room Candidate
- Yellow: Review Required
- Red: Rejected/Invalid Geometry

우측 패널:
- Layer
- Area
- Centroid
- Geometry Valid
- Candidate Score
- Matched Room Text

## 화면 3 — AI/CAD Match

```text
AI Room: 회의실 A

1. CAD Room 41A  Score 0.94  AUTO_MATCH
2. CAD Room 52B  Score 0.61  REJECTED
```

점수 상세:
- Geometry IoU
- Centroid
- Area
- Text
- Layer
- Gap to second candidate
