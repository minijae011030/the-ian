import { useEffect, useState } from 'react'
import { formatHour, getSeoulHour } from '../lib/seoulTime'

/** 왼쪽 위 서울 시각 표시 */
export function Clock() {
  const [hour, setHour] = useState(getSeoulHour)

  useEffect(() => {
    const id = setInterval(() => setHour(getSeoulHour()), 250)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: 24,
        color: 'rgba(255, 255, 255, 0.85)',
        font: '500 13px/1.4 "Helvetica Neue", Arial, sans-serif',
        letterSpacing: '0.12em',
        pointerEvents: 'none',
        textShadow: '0 1px 6px rgba(0, 0, 0, 0.35)',
      }}
    >
      SEOUL {formatHour(hour)}
    </div>
  )
}
