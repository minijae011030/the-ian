import { BUILDING } from '../scene/building/config'
import { moveFloors, useViewFloor } from '../state/camera'
import { useFocused } from '../state/focus'

const button: React.CSSProperties = {
  width: 36,
  height: 36,
  border: 0,
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.14)',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
}

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
    <div
      style={{
        position: 'fixed',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 999,
        background: 'rgba(12, 18, 34, 0.6)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        font: '600 12px/1 "Helvetica Neue", Arial, sans-serif',
        letterSpacing: '0.06em',
      }}
    >
      <button style={button} onClick={() => moveFloors(1)} aria-label="한 층 위로">
        ▲
      </button>
      <span style={{ padding: '6px 0' }}>{label(floor)}</span>
      <button style={button} onClick={() => moveFloors(-1)} aria-label="한 층 아래로">
        ▼
      </button>
    </div>
  )
}
