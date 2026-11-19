import { useEffect } from 'react'
import { SLOT_BY_ID, formatSlot } from '../scene/building/config'
import { setFocused, useFocused } from '../state/focus'

/** 방 들여다보는 중일 때 위에 뜨는 방 이름 + 나가기. Esc로도 나감 */
export function FocusOverlay() {
  const focused = useFocused()
  const slot = focused ? SLOT_BY_ID.get(focused) : undefined

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocused(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!slot) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 32,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 12px 10px 20px',
        borderRadius: 999,
        background: 'rgba(12, 18, 34, 0.72)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        font: '500 14px/1 "Helvetica Neue", "Apple SD Gothic Neo", sans-serif',
      }}
    >
      <span>{formatSlot(slot)}</span>
      <button
        onClick={() => setFocused(null)}
        style={{
          border: 0,
          borderRadius: 999,
          padding: '8px 14px',
          background: 'rgba(255, 255, 255, 0.16)',
          color: '#fff',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        나가기 (Esc)
      </button>
    </div>
  )
}
