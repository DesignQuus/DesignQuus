import { useRef } from 'react'
import { isDev } from '../../store/useDevStore.js'

// Hidden activation button — 5 rapid clicks in 3s toggles DEV mode via URL reload.
// Invisible to regular users (transparent, cursor unchanged, no hover effect).
// In DEV mode: tiny orange indicator dot shows it's active.
export default function DevTrigger() {
  const clicksRef = useRef(0)
  const timerRef = useRef(null)

  const handleClick = () => {
    clicksRef.current += 1

    if (timerRef.current) clearTimeout(timerRef.current)

    if (clicksRef.current >= 5) {
      clicksRef.current = 0
      const url = new URL(window.location.href)
      if (isDev) {
        url.searchParams.delete('dev')
      } else {
        url.searchParams.set('dev', '1')
      }
      window.location.href = url.toString()
    } else {
      timerRef.current = setTimeout(() => {
        clicksRef.current = 0
      }, 3000)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        // DEV mode active: tiny orange dot visible to the designer
        // Regular mode: completely invisible — no color, no cursor change
        width: isDev ? 10 : 28,
        height: isDev ? 10 : 28,
        background: isDev ? '#f97316' : 'transparent',
        borderRadius: isDev ? '0 0 4px 0' : 0,
        cursor: 'default',
        userSelect: 'none',
      }}
    />
  )
}
