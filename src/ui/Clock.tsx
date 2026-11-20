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
    <div className="pointer-events-none fixed top-5 left-6 text-[13px]/[1.4] font-medium tracking-[0.12em] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.35)]">
      SEOUL {formatHour(hour)}
    </div>
  )
}
