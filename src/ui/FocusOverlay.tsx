import { useEffect, useState } from 'react'
import { getSeoulHour } from '../lib/seoulTime'
import { currentActivity, ROOM_BY_ID } from '../scene/building/rooms'
import { setFocused, useFocused } from '../state/focus'

/** 방 들여다보는 중일 때 아래에 뜨는 방 이름 · 지금 하는 일 · 나가기. Esc로도 나감 */
export function FocusOverlay() {
  const focused = useFocused()
  const room = focused ? ROOM_BY_ID.get(focused) : undefined
  const [hour, setHour] = useState(getSeoulHour)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocused(null)
    const id = setInterval(() => setHour(getSeoulHour()), 1000)
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!room) return null
  const activity = currentActivity(room, hour)

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
        whiteSpace: 'nowrap',
      }}
    >
      <span>
        <b style={{ fontWeight: 700 }}>{room.name}</b>
        <span style={{ opacity: 0.55, margin: '0 8px' }}>·</span>
        {room.floor}층
        <span style={{ opacity: 0.55, margin: '0 8px' }}>·</span>
        <span style={{ opacity: 0.85 }}>{activity.label}</span>
      </span>
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
