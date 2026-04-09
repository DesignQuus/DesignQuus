# DesignQuus — 디자인 가이드

참고 레퍼런스: 데키리 선반 컨피규레이터 (스피드랙 스타일)

---

## 1. 색상 팔레트 (Color Palette)

### 주요 색상
| 역할 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| 브랜드 주색 | Orange | `#F97316` | CTA 버튼, 활성 탭, 슬라이더, 아이콘 |
| 브랜드 보조 | Orange Dark | `#EA6C0A` | 버튼 hover, 강조 |
| 배경 (3D 뷰) | Warm Ivory | `#F5F0E8` | 3D 뷰어 배경 |
| 배경 (패널) | White | `#FFFFFF` | 왼쪽 설정 패널 |
| 사이드바 배경 | Charcoal | `#1C1C1C` | 왼쪽 아이콘 내비게이션 |
| 사이드바 텍스트 | Light Gray | `#9CA3AF` | 비활성 아이콘 라벨 |
| 사이드바 활성 | Orange | `#F97316` | 활성 메뉴 아이콘 배경 |
| 카드 배경 | White | `#FFFFFF` | 공간 선택 카드 |
| 카드 테두리 | Gray 200 | `#E5E7EB` | 카드 border |
| 카드 활성 테두리 | Orange | `#F97316` | 선택된 카드 |
| 텍스트 기본 | Gray 800 | `#1F2937` | 제목, 라벨 |
| 텍스트 보조 | Gray 500 | `#6B7280` | 설명, 단위 |
| 그리드 선 | Light Blue | `#BDD5F0` | 3D 바닥 그리드 |
| 바운딩박스 | Sky Blue | `#93C5FD` | 공간 와이어프레임 |
| 요약 숫자 | Orange | `#F97316` | 하단 공간 요약 수치 |

### CSS 변수 정의 (tailwind.config.js에 추가)
```js
colors: {
  brand: {
    DEFAULT: '#F97316',
    dark:    '#EA6C0A',
    light:   '#FED7AA',
  },
  panel:   '#FFFFFF',
  sidebar: '#1C1C1C',
  viewer:  '#F5F0E8',
}
```

---

## 2. 타이포그래피

| 요소 | 크기 | 굵기 | 색상 |
|------|------|------|------|
| 패널 제목 | 14px | Bold 700 | `#1F2937` |
| 카드 제목 | 13px | SemiBold 600 | `#1F2937` |
| 카드 부제 (치수) | 11px | Normal 400 | `#6B7280` |
| 슬라이더 라벨 | 12px | Medium 500 | `#374151` |
| 슬라이더 단위 힌트 | 10px | Normal 400 | `#F97316` |
| 슬라이더 범위 | 10px | Normal 400 | `#9CA3AF` |
| 입력 숫자 | 13px | SemiBold 600 | `#1F2937` |
| 요약 숫자 | 24px | Bold 700 | `#F97316` |
| 요약 라벨 | 11px | Normal 400 | `#6B7280` |
| CTA 버튼 | 14px | Bold 700 | `#FFFFFF` |
| 사이드바 라벨 | 10px | Normal 400 | `#9CA3AF` |

폰트 패밀리: `'Pretendard', 'Noto Sans KR', -apple-system, sans-serif`

---

## 3. 레이아웃 구조

```
┌──────┬───────────────────────┬─────────────────────────────────┐
│ 사이 │  왼쪽 설정 패널        │  3D 뷰어                        │
│ 드   │  (320px 고정)          │  (나머지 전체)                   │
│ 바   │                        │                                  │
│ 48px │  ┌─────────────────┐   │  Sketch / Real 토글 (우상단)    │
│      │  │ 공간 설정 카드   │   │                                  │
│ 아이 │  │ (선택형 그리드)  │   │  바운딩박스 + 그리드             │
│ 콘   │  └─────────────────┘   │                                  │
│ 탭   │  슬라이더 섹션          │                                  │
│      │  공간 요약              │  ViewCube (우하단)               │
│      │  ─────────────────      │                                  │
│      │  [다음: 제품 선택 →]    │                                  │
└──────┴───────────────────────┴─────────────────────────────────┘
│ 하단바: 제품 이름 | 0원                    서비스 구매  dekiri.com │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. 컴포넌트 스타일

### 사이드바 (Sidebar)
```css
width: 48px;
background: #1C1C1C;
display: flex; flex-direction: column; align-items: center;
padding: 8px 0;

/* 아이콘 버튼 */
.sidebar-item {
  width: 40px; height: 40px;
  border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: #9CA3AF;
  font-size: 10px;
}
.sidebar-item.active {
  background: #F97316;
  color: #FFFFFF;
}
```

### 설정 패널 (Config Panel)
```css
width: 320px;
background: #FFFFFF;
border-right: 1px solid #E5E7EB;
overflow-y: auto;
padding: 16px;
```

### 공간 선택 카드 (Space Card)
```css
.space-card {
  border: 1.5px solid #E5E7EB;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  background: #FFFFFF;
  transition: all 0.15s;
}
.space-card:hover   { border-color: #FED7AA; background: #FFF7ED; }
.space-card.selected { border-color: #F97316; background: #FFF7ED; }

.space-card-title  { font-size: 13px; font-weight: 600; color: #1F2937; }
.space-card-spec   { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
```

### 슬라이더 (Slider)
```css
input[type='range'] {
  accent-color: #F97316;
  height: 4px;
  border-radius: 2px;
  background: #E5E7EB;
}
input[type='range']::-webkit-slider-thumb {
  background: #F97316;
  width: 16px; height: 16px;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(249,115,22,0.4);
}

/* 숫자 입력 + — + 버튼 */
.number-input-group {
  display: flex; align-items: center; gap: 4px;
  border: 1px solid #E5E7EB; border-radius: 6px;
  padding: 4px 8px;
}
.number-input-group button {
  color: #6B7280; font-size: 14px; line-height: 1;
}
.number-input-group input {
  width: 52px; text-align: center;
  font-size: 13px; font-weight: 600;
  border: none; outline: none;
}
```

### CTA 버튼 (다음 단계)
```css
.btn-cta {
  width: 100%;
  background: #F97316;
  color: #FFFFFF;
  font-size: 14px; font-weight: 700;
  border-radius: 8px;
  padding: 14px 24px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background 0.15s;
}
.btn-cta:hover { background: #EA6C0A; }
```

### 공간 요약 (Summary Bar)
```css
.summary-bar {
  background: #F9FAFB;
  border-top: 1px solid #E5E7EB;
  padding: 12px 16px;
  display: flex; justify-content: space-around;
}
.summary-item-value { font-size: 24px; font-weight: 700; color: #F97316; }
.summary-item-label { font-size: 11px; color: #6B7280; }
```

### 하단 바 (Bottom Bar)
```css
.bottom-bar {
  height: 40px;
  background: #1C1C1C;
  display: flex; align-items: center;
  padding: 0 16px;
  color: #9CA3AF; font-size: 12px;
}
.bottom-bar .price { color: #FFFFFF; font-size: 14px; font-weight: 700; }
.btn-purchase {
  background: #10B981; color: #FFFFFF;
  border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 600;
}
.btn-dekiri {
  border: 1px solid #F97316; color: #F97316;
  border-radius: 6px; padding: 6px 14px; font-size: 12px;
}
```

### Sketch / Real 토글
```css
.render-toggle {
  display: flex; gap: 4px;
  background: #FFFFFF; border: 1px solid #E5E7EB;
  border-radius: 8px; padding: 3px;
}
.render-toggle button {
  padding: 4px 12px; border-radius: 6px;
  font-size: 12px;
}
.render-toggle button.active {
  background: #F97316; color: #FFFFFF;
}
```

---

## 5. 3D 뷰어 설정

```
배경색:    #F5F0E8  (Warm Ivory)
그리드색:  #BDD5F0  (Light Blue)
바운딩박스: #93C5FD  (Sky Blue, 점선)
앰비언트:  intensity 0.8
디렉셔널:  position [5,10,5], intensity 0.6
그림자:    subtle ContactShadows, opacity 0.2
```

---

## 6. UX 패턴

- **단계별 마법사**: 공간 설정 → 제품 선택 → 세부 조정 → 저장/공유
- **공간 프리셋**: 카드 선택 시 슬라이더 값 자동 채움
- **실시간 3D**: 슬라이더 변경 즉시 3D 모델 반영
- **툴팁 온보딩**: 첫 진입 시 단계 안내 말풍선
- **슬라이더 + 직접 입력**: `—` `+` 버튼 + 숫자 직접 입력 모두 지원
- **하단 고정 CTA**: 스크롤해도 항상 보이는 "다음: 제품 선택" 버튼

---

## 7. 현재 코드와의 차이점 (마이그레이션 필요 항목)

| 항목 | 현재 | 목표 |
|------|------|------|
| 패널 스타일 | 보라 그라디언트 플로팅 | 흰색 고정 패널 (좌측) |
| 배경 | 어두운 네이비 `#1a1a2e` | 따뜻한 아이보리 `#F5F0E8` |
| 슬라이더 색 | 틸 `#2dd4bf` | 오렌지 `#F97316` |
| 탭 위치 | 상단 중앙 | 좌측 사이드바 아이콘 |
| 레이아웃 | 3D 전체 + 플로팅 패널 | 사이드바 + 고정 패널 + 3D |
| CTA | 없음 | 하단 오렌지 버튼 |
| 하단 바 | 없음 | 가격 + 구매 버튼 |
