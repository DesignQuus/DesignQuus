# Core API

권장: NestJS 기반 Modular Monolith.

```text
src/modules/
├─ project
├─ document
├─ model
├─ compliance
├─ calculation
├─ approval
└─ jobs
```

각 모듈 내부 권장 구조:

```text
module/
├─ application/{commands,queries,services}
├─ domain/{entities,value-objects,services,errors}
├─ infrastructure/{repositories,persistence}
├─ presentation/{controllers,dto}
└─ module.ts
```
