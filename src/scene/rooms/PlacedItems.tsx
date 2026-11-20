import type { ActivityKind } from '../../data/rooms'
import { CATALOG } from '../../items/catalog'
import { isVisible } from './layoutData'
import type { PlacedItem } from './types'

/** 배치 데이터대로 아이템들 그리기 (뷰어·에디터 공용) */
export function PlacedItems({
  items,
  kind,
  lit,
  showHidden = false,
}: {
  items: PlacedItem[]
  kind: ActivityKind
  lit: boolean
  /** 에디터: when 조건에 안 맞는 아이템도 그림 */
  showHidden?: boolean
}) {
  return (
    <>
      {items
        .filter((placed) => showHidden || isVisible(placed, kind))
        .map((placed) => (
          <PlacedItemMesh key={placed.id} placed={placed} lit={lit} />
        ))}
    </>
  )
}

export function PlacedItemMesh({ placed, lit }: { placed: PlacedItem; lit: boolean }) {
  const def = CATALOG[placed.item]
  if (!def) return null
  return (
    <group position={[placed.x, placed.y, placed.z]} rotation-y={(placed.rot * Math.PI) / 180}>
      {def.render({ variant: placed.variant ?? def.variants[0], lit })}
    </group>
  )
}
