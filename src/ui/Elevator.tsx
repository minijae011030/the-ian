import { BUILDING } from '../scene/building/config'
import { moveFloors, useViewFloor } from '../state/camera'
import { useFocused } from '../state/focus'

const BUTTON = 'size-9 cursor-pointer rounded-full bg-white/15 text-sm text-white hover:bg-white/25'

function label(floor: number) {
  if (floor >= BUILDING.floors) return 'R'
  return `${Math.max(1, floor + 1)}F`
}

/** 오른쪽 엘리베이터 패널. 시선 높이를 한 층씩 위아래로 (키보드 ↑↓도 됨) */
export function Elevator() {
  const floor = useViewFloor()
  const focused = useFocused()
  if (focused) return null

  return (
    <div className="fixed top-1/2 right-5 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full bg-[rgba(12,18,34,0.6)] p-2 text-xs/none font-semibold tracking-[0.06em] text-white backdrop-blur-md">
      <button className={BUTTON} onClick={() => moveFloors(1)} aria-label="한 층 위로">
        ▲
      </button>
      <span className="py-1.5">{label(floor)}</span>
      <button className={BUTTON} onClick={() => moveFloors(-1)} aria-label="한 층 아래로">
        ▼
      </button>
    </div>
  )
}
