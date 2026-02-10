# AutoCAD BOM 추출 도구

AutoCAD 도면에서 BOM(Bill of Materials, 자재 명세서)을 자동으로 추출하는 스크립트 모음입니다.

## 구성

```
autocad-bom/
├── lisp/
│   ├── bom-extract.lsp       # AutoLISP 메인 BOM 추출 스크립트
│   └── bom-multi-dwg.lsp     # 다중 도면 일괄 추출
├── python/
│   ├── bom_extract_dxf.py    # Python DXF 파서 기반 추출
│   └── requirements.txt      # Python 의존성
└── README.md
```

## 1. AutoLISP 스크립트 (AutoCAD 내부)

AutoCAD 환경에서 직접 실행하는 방식입니다.

### 설치

1. AutoCAD 실행
2. `APPLOAD` 명령 입력
3. `bom-extract.lsp` 파일 선택 → 로드
4. (선택) `bom-multi-dwg.lsp` 추가 로드

### 명령어

| 명령어 | 설명 |
|--------|------|
| `BOM` | 사용자가 선택한 블록에서 BOM 추출 → CSV |
| `BOMALL` | 현재 도면 전체에서 BOM 추출 → CSV |
| `BOMTABLE` | 도면 전체 BOM을 도면 내 테이블로 삽입 |
| `BOMCONFIG` | 추출 설정 변경 (그룹화 키, 정렬, 제외 태그 등) |
| `BOMMULTI` | 폴더 내 모든 DWG 파일 일괄 BOM 추출 → 통합 CSV |

### 사용 예시

```
명령: BOM
→ 블록 선택 → CSV 파일 경로 지정 → 완료

명령: BOMALL
→ 전체 도면 자동 스캔 → CSV 저장

명령: BOMCONFIG
→ 그룹화 기준, 정렬, 구분자, 제외 태그 등 설정 변경
```

### 설정 항목

`BOMCONFIG` 명령으로 변경 가능:

- **그룹화 기준 태그** (기본: `PART_NO`) - 동일 부품 수량 집계 기준
- **정렬 기준 태그** (기본: `PART_NO`) - 출력 정렬 기준
- **수량 필드명** (기본: `QTY`) - 수량 컬럼 이름
- **CSV 구분자** (기본: `,`)
- **제외 태그** (기본: `SCALE`, `DATE`, `DWG_NO`)

### 전제 조건

- 도면 내 블록에 **속성(Attribute)**이 정의되어 있어야 합니다
- 속성이 없는 블록은 `ATTDEF` 명령으로 속성을 추가하세요

## 2. Python 스크립트 (AutoCAD 불필요)

AutoCAD 없이 DXF 파일에서 BOM을 추출하는 독립 실행 스크립트입니다.

### 설치

```bash
cd autocad-bom/python
pip install -r requirements.txt
```

### 사용법

```bash
# 단일 DXF 파일
python bom_extract_dxf.py drawing.dxf

# 폴더 내 전체 DXF 일괄 추출
python bom_extract_dxf.py ./drawings/ --recursive

# 그룹화 키 및 출력 파일 지정
python bom_extract_dxf.py drawing.dxf -g PART_NO -o bom_output.csv

# Excel(xlsx) 형식 출력
python bom_extract_dxf.py drawing.dxf --format xlsx

# 특정 태그만 포함
python bom_extract_dxf.py drawing.dxf --include PART_NO DESCRIPTION MATERIAL

# 특정 태그 제외
python bom_extract_dxf.py drawing.dxf --exclude SCALE DATE DWG_NO

# 그룹화 없이 개별 항목 출력
python bom_extract_dxf.py drawing.dxf --no-group
```

### 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-o, --output` | 출력 파일 경로 | 자동 생성 |
| `-g, --group-by` | 수량 그룹화 기준 태그 | `PART_NO` |
| `-s, --sort-by` | 정렬 기준 태그 | `PART_NO` |
| `--no-group` | 그룹화 비활성화 | - |
| `-r, --recursive` | 하위 디렉터리 포함 | - |
| `--format` | 출력 형식 (`csv` / `xlsx`) | `csv` |
| `--delimiter` | CSV 구분자 | `,` |
| `--exclude` | 제외할 태그 목록 | `SCALE DATE DWG_NO` |
| `--include` | 포함할 태그 목록 | 전체 |
| `--count-field` | 수량 필드명 | `QTY` |

## 출력 예시

### CSV 출력

```csv
BLOCK_NAME,PART_NO,DESCRIPTION,MATERIAL,QTY
BOLT,B-M10X30,M10x30 육각볼트,STS304,24
NUT,N-M10,M10 육각너트,STS304,24
PLATE,P-001,베이스 플레이트,SS400,2
PIPE,PP-50A,50A 배관,STS316L,8
```

### 테이블 출력 (BOMTABLE)

도면 내에 직접 삽입되는 AutoCAD Table 객체로, 제목/헤더/데이터 행이 포함됩니다.
