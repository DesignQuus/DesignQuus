# AI HVAC Engineering OS — GitHub Runtime Bootstrap v1.0.2

이 디렉터리는 AI HVAC Engineering OS v1.0.1 전체 소스 패키지를 GitHub CI 환경에 연결하기 위한 **Bootstrap Runtime Certification**입니다.

## 목적

GitHub-hosted Linux Runner에서 다음 런타임 체인을 실제 검증합니다.

```text
Node.js 24.17.0
→ Docker Engine
→ PostgreSQL 18
→ PostGIS 3.6
→ Exact Geometry IoU
→ Engineering E2E
→ Runtime Certificate
```

## Engineering E2E

```text
SPACE
CONFERENCE_ROOM
20 m²
20 people
60 m³

→ Required Ventilation
500 m³/h

→ ERV Catalog
ERV-A / ERV-B / ERV-C

→ Equipment Selection
ERV-A Rank 1

→ Design BOM
4 items

→ Approval Gate
REVIEW_READY
BLOCKER 0
```

## 전체 소스 패키지 연결 기준

전체 검증 소스 패키지:

```text
ai-hvac-engineering-os-runtime-certification-v1.0.1.zip
```

SHA-256:

```text
ece0e2b5750c0e309a6d78ed302b8b4ba2e2a48a06db6a0733542bee6b87b660
```

현재 Bootstrap은 GitHub Runner와 Docker/PostGIS 실행경로를 먼저 인증합니다. 전체 v1.0.1 소스 트리는 별도 패키지로 유지하며, GitHub에 전체 소스가 배포된 뒤 기존 83개 회귀 테스트와 NestJS/Next.js 빌드를 같은 Workflow에 결합합니다.

## 상태

```text
GITHUB_RUNTIME_BOOTSTRAP_READY
```
