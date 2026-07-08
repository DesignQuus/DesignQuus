# SPACE Ventilation Design UI v0.8

## Route

```text
/projects/[projectId]/revisions/[revisionId]/spaces/[spaceId]/ventilation
```

## 1. SPACE Profile

```text
┌─────────────────────────────────────────────────────────┐
│ 회의실 A · SPACE B1-R001                                │
├─────────────────────────┬───────────────────────────────┤
│ 속성                    │ 선택값 / 출처                  │
├─────────────────────────┼───────────────────────────────┤
│ 용도                    │ CONFERENCE_ROOM · CAD+USER    │
│ 면적                    │ 20.000 m² · Exact CAD         │
│ 설계인원                │ 20명 · User Confirmed         │
│ 천장고                  │ 3.0 m · AI Extraction         │
│ 체적                    │ 60.000 m³ · Derived           │
│ 외벽면적                │ 12.000 m² · CAD Derived       │
│ 창면적                  │ 6.000 m² · CAD Derived        │
└─────────────────────────┴───────────────────────────────┘
```

충돌:

```text
설계인원
AI: 18명
사용자: 20명

선택:
20명
```

## 2. Rule

```text
적용 Rule
DEMO-CONFERENCE-VENT-001 v1

Source
DEMO INTERNAL POLICY

Status
APPROVED / CONTENT_VERIFIED

Method
MAX_OF
```

운영 법령 Source가 `METADATA_ONLY`이면:

```text
⛔ 법적 수치 미승인
VENTILATION_PARAMETER_UNVERIFIED
```

## 3. 계산

```text
인원 기준
20 × 25 = 500 m³/h

면적 기준
20 × 4 = 80 m³/h

MAX_OF
500 m³/h
```

## 4. ERV Selection Requirement

```text
Required Flow
500 m³/h

Source Rule
DEMO-CONFERENCE-VENT-001 v1

[장비 후보 생성]
```
