import { useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import useShelfStore from '../../store/useShelfStore.js'

// ── 아이콘 SVG (인라인) ──────────────────────────────────────────────────────

const IconAlignLeft  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="1.5" height="10" rx="0.75"/><rect x="3" y="4" width="7" height="2.5" rx="1"/><rect x="3" y="7.5" width="10" height="2.5" rx="1"/></svg>
const IconAlignCX    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="6.25" y="1" width="1.5" height="12" rx="0.75"/><rect x="3" y="3.5" width="8" height="2.5" rx="1"/><rect x="2" y="8" width="10" height="2.5" rx="1"/></svg>
const IconAlignRight = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="11.5" y="2" width="1.5" height="10" rx="0.75"/><rect x="4" y="4" width="7" height="2.5" rx="1"/><rect x="1" y="7.5" width="10" height="2.5" rx="1"/></svg>
const IconAlignBack  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="10" height="1.5" rx="0.75"/><rect x="4" y="3" width="2.5" height="7" rx="1"/><rect x="7.5" y="3" width="2.5" height="10" rx="1"/></svg>
const IconAlignCZ    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="6.25" width="12" height="1.5" rx="0.75"/><rect x="3.5" y="3" width="2.5" height="8" rx="1"/><rect x="8" y="2" width="2.5" height="10" rx="1"/></svg>
const IconAlignFront = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="11.5" width="10" height="1.5" rx="0.75"/><rect x="4" y="4" width="2.5" height="7" rx="1"/><rect x="7.5" y="1" width="2.5" height="10" rx="1"/></svg>
const IconDistrib    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="1.5" height="10" rx="0.75"/><rect x="11.5" y="2" width="1.5" height="10" rx="0.75"/><rect x="5.5" y="3.5" width="3" height="7" rx="1"/></svg>

// ── 버튼 그룹 ────────────────────────────────────────────────────────────────

function AlignBtn({ icon, label, title, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 3, padding: '5px 2px 4px',
        background: accent ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${accent ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 6, cursor: 'pointer',
        color: accent ? '#f97316' : 'rgba(255,255,255,0.7)',
        fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
        transition: 'all 0.12s',
        minWidth: 0,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: 1.2, color: 'rgba(255,255,255,0.35)',
      marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function AlignPanel() {
  const {
    shelves, shelfGap, spaceWidth, spaceDepth,
    setGroupOffsetX, setGroupOffsetZ, setShelfOffset,
  } = useShelfStore(useShallow(s => ({
    shelves:        s.shelves,
    shelfGap:       s.shelfGap,
    spaceWidth:     s.spaceWidth,
    spaceDepth:     s.spaceDepth,
    setGroupOffsetX: s.setGroupOffsetX,
    setGroupOffsetZ: s.setGroupOffsetZ,
    setShelfOffset:  s.setShelfOffset,
  })))

  const totalSpan = shelves.reduce((sum, s) => sum + s.width, 0)
    + Math.max(0, shelves.length - 1) * shelfGap
  const maxDepth = Math.max(...shelves.map(s => s.depth), 1)

  // ── 공간 기준 X (좌/중/우) ────────────────────────────────────────────────
  const alignSpaceX = useCallback((mode) => {
    // Left edge = groupOffsetX/100 - totalSpan/200  (world units)
    // BBox left  = -spaceWidth/200
    if (mode === 'left')   setGroupOffsetX((totalSpan - spaceWidth) / 2)
    else if (mode === 'center') setGroupOffsetX(0)
    else if (mode === 'right')  setGroupOffsetX((spaceWidth - totalSpan) / 2)
  }, [totalSpan, spaceWidth, setGroupOffsetX])

  // ── 공간 기준 Z (뒤/중/앞) ────────────────────────────────────────────────
  const alignSpaceZ = useCallback((mode) => {
    if (mode === 'back')   setGroupOffsetZ(0)
    else if (mode === 'center') setGroupOffsetZ((spaceDepth - maxDepth) / 2)
    else if (mode === 'front')  setGroupOffsetZ(spaceDepth - maxDepth)
  }, [maxDepth, spaceDepth, setGroupOffsetZ])

  // ── 선반 간 Z 정렬 (앞면/뒷면 플러시) ───────────────────────────────────
  const alignShelvesZ = useCallback((mode) => {
    if (mode === 'back') {
      shelves.forEach(s => setShelfOffset(s.id, s.offsetX || 0, 0))
    } else if (mode === 'front') {
      const maxFront = Math.max(...shelves.map(s => s.depth + (s.offsetZ || 0)))
      shelves.forEach(s => setShelfOffset(s.id, s.offsetX || 0, maxFront - s.depth))
    } else if (mode === 'center') {
      const avg = shelves.reduce((sum, s) => sum + (s.offsetZ || 0), 0) / shelves.length
      shelves.forEach(s => setShelfOffset(s.id, s.offsetX || 0, avg))
    }
  }, [shelves, setShelfOffset])

  // ── 선반 간 X 균등 배분 ───────────────────────────────────────────────────
  const distributeX = useCallback(() => {
    // 개별 offsetX 초기화 + 그룹 중앙 정렬 → auto-centering이 균등 배분
    shelves.forEach(s => setShelfOffset(s.id, 0, s.offsetZ || 0))
    setGroupOffsetX(0)
  }, [shelves, setShelfOffset, setGroupOffsetX])

  const multi = shelves.length > 1

  return (
    <div style={{
      marginTop: 10,
      borderTop: '1px solid rgba(255,255,255,0.12)',
      paddingTop: 10,
    }}>
      {/* 섹션 헤더 */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#f97316',
        marginBottom: 8, letterSpacing: 0.5,
      }}>
        정  렬
      </div>

      {/* ── 공간 기준 X 정렬 ── */}
      <SectionLabel>가상공간 X (좌 · 중 · 우)</SectionLabel>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <AlignBtn icon={<IconAlignLeft />}  label="좌벽" title="선반 좌측 모서리를 가상공간 좌벽에 정렬" onClick={() => alignSpaceX('left')} />
        <AlignBtn icon={<IconAlignCX />}    label="중앙" title="가상공간 X 중앙선에 정렬"              onClick={() => alignSpaceX('center')} accent />
        <AlignBtn icon={<IconAlignRight />} label="우벽" title="선반 우측 모서리를 가상공간 우벽에 정렬" onClick={() => alignSpaceX('right')} />
      </div>

      {/* ── 공간 기준 Z 정렬 ── */}
      <SectionLabel>가상공간 Z (뒤 · 중 · 앞)</SectionLabel>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <AlignBtn icon={<IconAlignBack />}  label="뒷벽" title="선반 뒷면을 z=0 기준선에 정렬 (기본)"  onClick={() => alignSpaceZ('back')} accent />
        <AlignBtn icon={<IconAlignCZ />}    label="중앙" title="가상공간 Z 중앙선에 정렬"              onClick={() => alignSpaceZ('center')} />
        <AlignBtn icon={<IconAlignFront />} label="앞벽" title="선반 앞면을 가상공간 앞벽에 정렬"      onClick={() => alignSpaceZ('front')} />
      </div>

      {/* ── 선반 간 정렬 (다중 선반일 때만) ── */}
      {multi && (
        <>
          <SectionLabel>선반 간 깊이 정렬</SectionLabel>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <AlignBtn icon={<IconAlignBack />}  label="뒷면" title="모든 선반 뒷면을 z=0에 맞춤"        onClick={() => alignShelvesZ('back')} accent />
            <AlignBtn icon={<IconAlignCZ />}    label="중앙" title="모든 선반 Z 중심을 같은 위치로"      onClick={() => alignShelvesZ('center')} />
            <AlignBtn icon={<IconAlignFront />} label="앞면" title="모든 선반 앞면을 같은 Z로 정렬"      onClick={() => alignShelvesZ('front')} />
          </div>

          <SectionLabel>선반 간 X 배분</SectionLabel>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <AlignBtn icon={<IconDistrib />}  label="균등 배분" title="선반 간 X 간격을 균등하게 초기화" onClick={distributeX} />
            <AlignBtn icon={<IconAlignCX />}  label="그룹 중앙" title="선반 그룹을 가상공간 중앙에 정렬" onClick={() => { setGroupOffsetX(0) }} accent />
          </div>
        </>
      )}
    </div>
  )
}
