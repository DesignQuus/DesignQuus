# Rule Studio UI v0.9

## 1. Draft Editor

```text
Source
KDS-31-25-20-2026

Clause
[직접 입력 / Source Browser에서 선택]

Rule Code
VENT-...

Effective Date
2026-02-23

Conditions
[+ 조건 추가]

Calculation Method
MAX_OF

Parameters
[+ Parameter 추가]

[Compile]
```

## 2. Compile Result

```text
✅ Required fields
✅ Operators
✅ Date range
⚠ Source CONTENT not verified
⚠ Parameter not verified
```

## 3. Test Console

```text
Case 01 회의실 적용       PASSED
Case 02 사무실 미적용     PASSED
Case 03 인원 누락         FAILED
```

실패:

```text
Expected
REVIEW_REQUIRED

Actual
APPLICABLE
```

## 4. Approval Gate

```text
Compile          PASSED
Required Tests   12/12 PASSED
Source           CONTENT_VERIFIED
Parameters       ALL VERIFIED
Expert Review    PENDING
```
