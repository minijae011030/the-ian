import { Html } from '@react-three/drei'
import { CATALOG } from '../items/catalog'
import type { PlacedItem } from '../scene/rooms/types'

/** 선택한 물건 위에 뜨는 작은 바: 방향 · 빼기 */
export function ActionBar({
  item,
  onTurn,
  onRemove,
}: {
  item: PlacedItem
  onTurn: () => void
  onRemove: () => void
}) {
  const onWall = CATALOG[item.item]?.place === 'wall'
  return (
    <Html position={[item.x, item.y, item.z]} zIndexRange={[20, 0]}>
      <div className="actionbar" onPointerDown={(e) => e.stopPropagation()}>
        {!onWall && (
          <button onClick={onTurn}>
            <span>⟳</span>방향
          </button>
        )}
        <button className="out" onClick={onRemove}>
          <span>✕</span>빼기
        </button>
      </div>
    </Html>
  )
}
