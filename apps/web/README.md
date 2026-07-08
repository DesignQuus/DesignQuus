# Web

Next.js App Router 기반 설계자용 UI.

```text
/dashboard
/projects
/projects/[projectId]
/projects/[projectId]/revisions/[revisionId]/drawings
/projects/[projectId]/revisions/[revisionId]/spaces
/projects/[projectId]/revisions/[revisionId]/compliance
/projects/[projectId]/revisions/[revisionId]/calculations
/projects/[projectId]/revisions/[revisionId]/approvals
```

핵심 UX: AI 결과와 확정 데이터 분리, Confidence 표시, 원본 도면과 추출 객체 병렬 표시, 법령 근거 역추적, 계산 입력·단위·엔진 버전 표시, BLOCKER 우선 노출.
