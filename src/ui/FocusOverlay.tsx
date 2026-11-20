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
    <div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-[rgba(12,18,34,0.72)] py-2.5 pr-3 pl-5 text-sm/none font-medium whitespace-nowrap text-white backdrop-blur-md">
      <span>
        <b className="font-bold">{room.name}</b>
        <span className="mx-2 opacity-55">·</span>
        {room.floor}층
        <span className="mx-2 opacity-55">·</span>
        <span className="opacity-85">{activity.label}</span>
      </span>
      <button
        className="cursor-pointer rounded-full bg-white/15 px-3.5 py-2 hover:bg-white/25"
        onClick={() => setFocused(null)}
      >
        나가기 (Esc)
      </button>
    </div>
  )
}
