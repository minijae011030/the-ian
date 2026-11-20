import { Html } from '@react-three/drei'
import { CATALOG } from '../items/catalog'
import type { PlacedItem } from '../scene/rooms/types'
import { RotateIcon } from './icons'

const BUTTON = 'flex cursor-pointer items-center gap-1 px-2.5 py-1.5 font-bold hover:bg-hover'

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
      <div
        className="flex -translate-x-1/2 -translate-y-[150%] divide-x divide-[#3a3f4b] rounded-[3px] border border-[#3a3f4b] bg-panel whitespace-nowrap text-text shadow-[0_4px_14px_rgba(0,0,0,0.5)] select-none"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!onWall && (
          <button className={BUTTON} onClick={onTurn}>
            <span className="text-accent">
              <RotateIcon />
            </span>
            방향
          </button>
        )}
        <button className={BUTTON} onClick={onRemove}>
          <span className="text-danger">✕</span>빼기
        </button>
      </div>
    </Html>
  )
}
