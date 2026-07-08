# ERV 설계 UI

## Route

```text
/projects/[projectId]/revisions/[revisionId]/erv-design/[runId]
```

## 1. 도면 검토
- 원본 도면 + Bounding Box Overlay
- 실명 / 표준 실 유형 / 면적 / 인원 / Confidence
- Accept / Correct / Reject

## 2. 법령·Rule
- 적용 Rule
- Rule Version
- 시행일
- 입력값
- 결과
- 근거

## 3. 계산
- 필요 환기량
- Method
- Governing Contributor
- Formula Trace

## 4. 장비선정
- Rank / Model / Airflow / Static Pressure / Capacity Margin / Power / Cost / Delivery / Total Score
- 전문가 직접 선택

## 5. BOM
- 본체 / 기본 부품 / 네트워크 기반 부품 / 추가·삭제 사유

## 6. 승인
- BLOCKER / ERROR / WARNING
- APPROVED / REJECTED / REVISION_REQUIRED
