export default function BottomBar() {
  return (
    <div style={{
      height: 40, flexShrink: 0, background: '#1C1C1C',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
    }}>
      <span style={{ color: '#9CA3AF', fontSize: 12 }}>제품 없음</span>
      <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>0원</span>
      <div style={{ flex: 1 }} />
      <button style={{
        background: '#10B981', color: '#FFFFFF', border: 'none',
        borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>서비스 구매</button>
      <a href="https://dekiri.com" target="_blank" rel="noreferrer" style={{
        border: '1px solid #F97316', color: '#F97316',
        borderRadius: 6, padding: '5px 14px', fontSize: 12, textDecoration: 'none',
      }}>dekiri.com</a>
    </div>
  )
}
